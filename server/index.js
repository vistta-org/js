import fs from "@vistta/fs"
import http from "http";
import http2 from "http2";
import mime from "mime";
import compressible from "compressible";
import zlib from "zlib";
import proxy from "http-proxy";
import { EventEmitter } from "node:events";
import { Server as SocketIO } from "socket.io";
import { createPage, importCoreResources } from "./page.js";
import { default as Controller, Method } from "./controller.js";
import { RESOURCES_PATH, INVALID_EVENT_NAME, convertToEventName, async, isIPAddress, stringify, ensureEndsWith, assign } from "../utils/index.js";

const JAVASCRIPT_TYPESCRIPT_EXTENSIONS = [
  ".jsx",
  ".mjsx",
  ".cjsx",
  ".tsx",
  ".mtsx",
  ".ctsx",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts"
];

const ANY_METHODS = ["copy", "delete", "get", "move", "patch", "post", "put"];

class Server {
  #http;
  #https;
  #strict;
  #subdomains = {};
  #resources = {};
  #proxy = proxy.createProxyServer({});
  #socket = {
    server: new SocketIO(),
    subdomains: {},
  };
  #isBuild;

  get ports() {
    return {
      http: this.#http?.port,
      https: this.#https?.port
    };
  }

  get certs() {
    return this.#https?.certs;
  }

  get active() {
    return false;
  }

  /**
   * 
   * @typedef {Object} BuildOptions
   * @property {string} [output] - Output Directory
   * @property {boolean} [write] - Whether to write to the file system directly or return the files that would have been written as in-memory buffers  Default: true
   * 
   * @typedef {Object} ServerOptions
   * @property {string} [directory] - Directory
   * @property {number | boolean} [http] - Use http or http port
   * @property {number | boolean} [https] - Use https or https port
   * @property {string} [cert] - Certificate filepath
   * @property {string} [key] - Private key filepath
   * @property {boolean} [strict] - Strict routing, default is true
   * @property {boolean} [start] - Auto start, default is true
   * @property {boolean | string | BuildOptions} [build] - Static build
   * 
   * @param {string | ServerOptions} arg1 - Directory or server options
   * @param {ServerOptions | Function} [arg2] - Server options or callback
   * @param {Function} [arg3] - callback
   */
  constructor(arg1, arg2, arg3) {
    if (typeof arg1 === "string") arg2.directory = arg1;
    else arg3 = arg2, arg2 = arg1;
    let { directory, http: httpPort, https: httpsPort, cert, key, strict, start, build } = arg2;
    if (build) return this.#build(directory, build, arg3);
    if (httpPort === true) httpPort = process.env.NODE_ENV === "development" ? 3000 : 80;
    if (httpsPort === true) httpsPort = 443;
    if (!(httpPort || httpsPort)) throw new Error("Missing ports for either HTTP or HTTPS");
    if (httpsPort && !(cert || key)) {
      httpsPort = null;
      if (!httpPort) throw new Error("Missing certification for HTTPS");
      else console.warn("Disabled HTTPS due to missing certification");
    }
    this.#strict = strict !== false;
    if (httpPort) this.#http = { name: "http", server: http.createServer(this.#handler.bind(this)), port: httpPort };
    if (httpsPort) this.#https = {
      name: "https",
      server: http2.createSecureServer({
        allowHTTP1: true,
        key: fs.readFileSync(key),
        cert: fs.readFileSync(cert)
      }, this.#handler.bind(this)),
      port: httpsPort,
      certs: { cert, key }
    };
    this.#socket.server.on("connection", this.#socketHandler.bind(this));
    if (start === false) return this;
    this.start().then(({ http, https }) => {
      if (http) arg3?.(null, { message: "http ready", port: http });
      if (https) arg3?.(null, { message: "https ready", port: https });
      if (directory) this.use("/", directory, arg3);
    });
  }

  /**
   * Starts the server using the specified protocol (http or https). If no protocol is specified, both http and https are started.
   * 
   * @param {string} [protocol] The protocol to use for the server (http or https)
   * @returns {number|null} The port number that the server is listening on, or null if an error occurred
   */
  async start(protocol) {
    if (protocol === "http") protocol = this.#http;
    else if (protocol === "https") protocol = this.#https;
    else return (await this.start("http"), await this.start("https"), this.ports);
    if (!protocol) return null;
    if (protocol.active) throw new Error(protocol.name.toUpperCase() + " Server already running");
    const { server, port } = protocol;
    await async((resolve) => server.listen(port, resolve));
    this.#socket.server.attach(server);
    protocol.active = true;
    return port;
  }

  /**
   * Stops the server using the specified protocol (http or https). If no protocol is specified, both http and https are stopped.
   * 
   * @param {string} [protocol] The protocol to use for stopping the server (http or https)
   * @returns {boolean} True if the server was successfully stopped, false otherwise
   */
  async stop(protocol) {
    if (protocol === "http") protocol = this.#http;
    else if (protocol === "https") protocol = this.#https;
    else return await this.stop("http") && await this.stop("https");
    if (!protocol?.server) return true;
    if (!protocol.active) return false;
    await async((resolve) => protocol.server.close(resolve));
    protocol.active = false;
    return true;
  }

  /**
   * Routes HTTP COPY requests to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  copy(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("copy", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("copy", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP DELETE requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  delete(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("delete", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("delete", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP GET requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  get(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("get", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("get", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP MOVE requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  move(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("move", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("move", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP PATCH requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  patch(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("patch", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("patch", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP POST requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  post(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("post", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("post", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP PUT requests to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  put(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("put", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("put", subdomain, pathname, handler);
  }

  /**
   * Routes any HTTP requests to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  any(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("put", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("any", subdomain, pathname, handler);
  }

  /**
   * Routes any HTTP error to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   */
  error(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments("put", arg1, arg2, arg3);
    if (typeof handler !== "function") throw new TypeError("Invalid argument type");
    this.#register("error", subdomain, pathname, handler);
  }

  /**
   * @typedef {Object} ProxyOptions
   * @property {string} target - Target url
   * @property {boolean} ws - Include websocket  Default: true
   * @property {boolean} xfwd - Include x-forward header  Default: true
   * @property {boolean} secure - Allow only https  Default: false
   * @property {boolean} changeOrigin - Change origin  Default: false
   */

  /**
   * Routes all HTTP requests through a proxy from the specified subdomain and pathname to a target url.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | ProxyOptions} arg2 - Route pathname, target url or options
   * @param {string | ProxyOptions} [arg3] - Target url or options
   */
  proxy(arg1, arg2, arg3) {
    const [subdomain, pathname, targetOrOptions] = parseArguments("proxy", arg1, arg2, arg3);
    const typeOfTargetOrOptions = typeof targetOrOptions;
    if (typeOfTargetOrOptions !== "object" && typeOfTargetOrOptions !== "string") throw new TypeError("Invalid argument type");
    const options = typeOfTargetOrOptions === "string" ? { ws: true, xfwd: true, secure: false, changeOrigin: true, target: targetOrOptions } : { ws: true, xfwd: true, secure: false, changeOrigin: true, ...targetOrOptions };
    this.#register("any", subdomain, ensureEndsWith(pathname, "/*"), (req, res) => this.#proxy.web(req, res, options, (err) => res.reject(err?.message, 500)));
  }

  /**
   * Redirects all HTTP requests the specified subdomain and pathname to a target url.
   * 
   * @typedef {Object} RedirectOptions
   * @property {string} target - Target url
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | RedirectOptions} arg2 - Route pathname, target url or options
   * @param {string | RedirectOptions} [arg3] - Target url or options
   */
  redirect(arg1, arg2, arg3) {
    const [subdomain, pathname, target] = parseArguments("redirect", arg1, arg2, arg3);
    const typeOfTarget = typeof target;
    if (typeOfTarget !== "object" && typeOfTarget !== "string") throw new TypeError("Invalid argument type");
    const baseUrl = typeOfTarget === "string" ? typeOfTarget : typeOfTarget?.target;
    this.#register("any", subdomain, ensureEndsWith(pathname, "/*"), (req, res) => res.redirect(new URL(req.url || '/', baseUrl).toString()));
  }

  /**
   * Uses a folder structure or a single file as the basis for defining different types of routes (e.g., pages, APIs, middlewares, layouts). 
   * 
   * @typedef {Object} UseOptions
   * @property {string} [target] - Target directory
   * @property {string} [folder] - Target directory
   * @property {string} [app] - Target app page filepath
   * @property {string} [page] - Target page filepath
   * @property {string} [error] - Target error page filepath
   * @property {string} [controller] - Target controller filepath
   * @property {string} [config] - Target config filepath
   * @property {string} [middleware] - Target middleware filepath
   * @property {string} [layout] - Target layout filepath
   * @property {boolean} [api] - Allow api routes (directory)  Default: true
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | UseOptions} arg2 - Route pathname  Directory or options
   * @param {string | UseOptions | Function} arg3 - Directory, options or callback
   * @param {Function} [arg4] - callback
   */
  async use(arg1, arg2, arg3, arg4) {
    const callback = typeof arg4 === "function" ? arg4 : (typeof arg3 === "function" ? arg3 : () => null);
    const [subdomain, basepath, target] = typeof arg3 === "function" ? parseArguments("use", arg1, arg2) : parseArguments("use", arg1, arg2, arg3);
    const typeofTarget = typeof target;
    if (typeofTarget !== "string" && typeofTarget !== "object")
      throw new TypeError("Invalid argument type");
    const set = {
      api: async (pathname, _, handler) => {
        if (Object.isPrototypeOf.call(Controller, handler)) {
          return set.controller(pathname, _, handler);
        }
        else if (handler instanceof Method)
          this.#register(handler.type, subdomain, pathname, async (req, res) => {
            try {
              res.send(await handler(req));
            }
            catch (e) {
              res.reject(e.message, 500)
            }
          });
        else if (typeof handler === "function")
          this.#register("any", subdomain, pathname, handler);
        else throw new TypeError("Invalid api type");
        callback(null, { message: "api ready", subdomain, pathname });
      },
      controller: async (pathname, _, controller) => {
        if (!Object.isPrototypeOf.call(Controller, controller)) throw new TypeError("Invalid controller type");
        const socket = { emit: this.emit.bind(this, subdomain), on: this.on.bind(this, subdomain) };
        const handlers = Object.values(new controller(socket));
        for (let i = 0, len = handlers.length; i < len; i++) {
          const handler = handlers[i];
          if (!(handler instanceof Method)) continue;
          const handlerPathname = combinePathnames(pathname, handler.url);
          this.#register(handler.type, subdomain, handlerPathname, async (req, res) => {
            try {
              res.send(await handler(req));
            }
            catch (e) {
              res.reject(e.message, 500)
            }
          });
          callback(null, { message: "api ready", subdomain, pathname: handlerPathname });
        }
      },
      config: async (pathname, _, config) => {
        if (typeof config !== "object") throw new TypeError("Invalid config type");
        config = this.#register("config", subdomain, ensureEndsWith(pathname, "/"), config);
        const segments = pathname.split("/");
        matchRoutes(this.#subdomains[subdomain]?.page || [], pathname, ({ page }) => {
          const configs = page.inherited.configs;
          for (let i = 0, len = configs.length; i < len; i++) {
            if (checkIfMoreSpecific(segments, configs[i].pathname))
              return configs.splice(i, 0, config);
          }
          configs.push(config);
          page.cache.reset();
        });
        callback(null, { message: "config ready", subdomain, pathname });
      },
      middleware: async (pathname, _, middleware) => {
        if (typeof middleware !== "function") throw new TypeError("Invalid middleware type");
        middleware = this.#register("middleware", subdomain, ensureEndsWith(pathname, "/"), middleware);
        const segments = pathname.split("/");
        matchRoutes(this.#subdomains[subdomain]?.page || [], pathname, ({ page }) => {
          if (page.inherited.middleware && !checkIfMoreSpecific(segments, page.inherited.middleware.pathname)) return;
          page.inherited.middleware = middleware;
        });
        callback(null, { message: "middleware ready", subdomain, pathname });
      },
      layout: async (pathname, filepath, component) => {
        if (typeof component !== "function") throw new TypeError("Invalid layout type");
        const layout = this.#register("layout", subdomain, ensureEndsWith(pathname, "/"), {
          pathname,
          component,
          code: (
            await import(filepath, {
              with: {
                type: "bundler",
                globalName: "__app_layout_component",
                exports: "default"
              },
            })
          )?.code
        });
        const segments = pathname.split("/");
        matchRoutes(this.#subdomains[subdomain]?.page || [], pathname, ({ page }) => {
          if (page.inherited.layout && !checkIfMoreSpecific(segments, page.inherited.layout.pathname)) return;
          page.inherited.layout = layout;
          page.cache.reset();
        });
        callback(null, { message: "layout ready", subdomain, pathname });
      },
      page: async (pathname, filepath, type) => {
        const get = (type) => matchRoute(this.#subdomains[subdomain]?.[type] || [], pathname, { exact: false, filter: (route) => route[type] });
        const configs = [];
        const segments = pathname.split("/");
        for (let i = 0, len = (pathname === "/" ? 1 : segments.length); i < len; i++) {
          const config = matchRoute(this.#subdomains[subdomain]?.config || [], segments.slice(0, i + 1).join("/") || "/");
          if (config) configs.push(config);
        }
        const page = await createPage(type, filepath, pathname, configs, get("middleware"), get("layout"));
        if (!this.#resources[subdomain]) this.#resources[subdomain] = await importCoreResources(this.#isBuild);
        const resourceKeys = Object.keys(page.resources);
        console.log(resourceKeys)
        for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++)
          this.#resources[subdomain]["/" + RESOURCES_PATH + "/" + resourceKeys[i2]] = page.resources[resourceKeys[i2]];
        this.#register("page", subdomain, ensureEndsWith(pathname, "/"), page);
        if (page.config) set.config(pathname, filepath, page.config);
        this.#register("get", subdomain, ensureEndsWith(pathname, "/") + "page.js", page.middleware((req, res, props = {}) => res.send(page.js(req, props), "text/javascript")));
        this.#register("get", subdomain, ensureEndsWith(pathname, "/") + "page.css", page.middleware((req, res, props = {}) => res.send(page.css(req, props), "text/css")));
        if (type === "error") return this.#register("error", subdomain, pathname, (req, res, message, code) => send(req, res, code, page.html(req, { message, code }), "text/html"));
        this.#register("get", subdomain, pathname, page.middleware((req, res, props = {}) => res.send(page.html(req, props), "text/html")));
        callback(null, { message: "page ready", subdomain, pathname });
      }
    }
    let directory;
    if (typeofTarget === "object") {
      const stringProperties = ['target', 'folder', 'app', 'page', 'error', 'controller', 'config', 'middleware', 'layout'];
      let property = "";
      for (let i = 0, len = stringProperties.length; i < len; i++) {
        if (target[stringProperties[i]]) {
          if (property !== "") throw new TypeError("Only one of 'target', 'folder', 'controller', 'config', 'middleware', or 'layout' can be set at a time.");
          property = stringProperties[i];
        }
      }
      if (property === "controller" || property === "config" || property === "middleware" || property === "layout")
        return await set[property](basepath, target[property], (await import(target[property]))?.default);
      if (property === "app" || property === "page" || property === "error" || target[property])
        return await set.page(basepath, target[property], property || "page");
      else directory = target[property];
    }
    else if (!fs.isDirectory(target)) return set.page(basepath, target, "page");
    else directory = target;

    const entries = await fs.readdir(directory, { recursive: true });
    const use = async (type, pathname, filepath) => {
      try {
        if (type === "page" || type === "app" && pathname === "/" || type === "error") await set.page(pathname, filepath, type);
        else if (type === "api" || type === "config" || type === "middleware" || type === "layout")
          await set[type](pathname, filepath, (await import(filepath))?.default);
      }
      catch (e) {
        callback(e);
      }
    }
    for (let i = 0, len = entries.length; i < len; i++) {
      const filepath = fs.resolve(directory, entries[i]);
      const extname = fs.extname(filepath);
      if (fs.isDirectory(filepath) || !JAVASCRIPT_TYPESCRIPT_EXTENSIONS.includes(extname)) continue;
      const paths = entries[i].replace(/\.[^.]+$/, "").split("\\");
      const pathsLen = paths.length;
      if (pathsLen == 1) {
        await use(paths[0], combinePathnames(basepath, "/"), filepath);
        continue;
      }
      const isApi = target?.api !== false && entries[i].startsWith("api\\");
      let pathname = "";
      for (let i2 = 0; i2 < pathsLen; i2++) {
        const path = paths[i2];
        if (!isApi && i2 == (pathsLen - 1)) break;
        if (!path.endsWith("]")) pathname += "/" + path;
        else if (path.startsWith("[...")) {
          pathname += "/*";
          break;
        }
        else if (path.startsWith("["))
          pathname += "/:" + path.slice(1, -1);
        else pathname += "/" + path.slice(0, -1);
      }
      await use(isApi ? "api" : paths[pathsLen - 1], combinePathnames(basepath, pathname), filepath);
    }
  }

  /**
   * Enables all HTTP requests of the specified subdomain, method and pathname.
   * 
   * @param {string} arg1 Route subdomain, method or pathname
   * @param {string} arg2 Route method or pathname
   * @param {string} arg3 Route pathname
   */
  enables(arg1, arg2, arg3) {
    if (!arg1) throw new TypeError("Invalid argument type, disable expects at least a pathname");
    if (!arg2 && !arg3) arg3 = arg1, arg2 = "any", arg1 = "";
    else if (!arg3) arg3 = arg2, arg2 = arg1, arg1 = "";
    const routes = this.#subdomains[arg1];
    const route = arg3.replace(/:(\w+)/g, "([^/]+)").replace(/\*$/, ".*");
    if (arg2 === "any") {
      for (let i = 0, len = ANY_METHODS.length; i < len; i++) {
        const cur = findRoute(routes[ANY_METHODS[i]], route);
        if (cur) cur.active = true;
      }
    }
    else {
      const cur = findRoute(routes[arg2], route);
      if (cur) cur.active = true;
    }
  }

  /**
   * Disables all HTTP requests of the specified subdomain, method and pathname.
   * 
   * @param {string} arg1 Route subdomain, method or pathname
   * @param {string} arg2 Route method or pathname
   * @param {string} arg3 Route pathname
   */
  disable(arg1, arg2, arg3) {
    if (!arg1) throw new TypeError("Invalid argument type, disable expects at least a pathname");
    if (!arg2 && !arg3) arg3 = arg1, arg2 = "any", arg1 = "";
    else if (!arg3) arg3 = arg2, arg2 = arg1, arg1 = "";
    const routes = this.#subdomains[arg1];
    const route = arg3.replace(/:(\w+)/g, "([^/]+)").replace(/\*$/, ".*");
    if (arg2 === "any") {
      for (let i = 0, len = ANY_METHODS.length; i < len; i++) {
        const cur = findRoute(routes[ANY_METHODS[i]], route);
        if (cur) cur.active = false;
      }
    }
    else {
      const cur = findRoute(routes[arg2], route);
      if (cur) cur.active = false;
    }
  }

  /**
   * Emits an event to all connected sockets in a subdomain or globally.
   * 
   * @param {string} subdomain The subdomain of the socket to emit to. If not specified, the event will be emitted globally.
   * @param {string} event The name of the event to emit.
   * @param {...any} args Additional arguments to pass to the event listener.
   */
  emit(subdomain, event, ...args) {
    if (typeof event !== "string")
      return console.warn("Cannot emit an empty event");
    if (subdomain && subdomain !== "*") this.#socket.server.to(subdomain).emit(event, ...args);
    else this.#socket.server.emit(event, ...args);
  }

  /**
   * Listens for an event on all connected sockets in a subdomain or globally.
   * 
   * @param {string} subdomain The subdomain of the socket to listen on. If not specified, the listener will be attached to all sockets.
   * @param {string} event The name of the event to listen for.
   * @param {function} callback A function to call when the event is triggered.
   */
  on(subdomain, event, callback) {
    event = convertToEventName(event);
    if (!event) return console.warn(INVALID_EVENT_NAME), null;
    if (subdomain === "*") {
      const subdomains = Object.keys(this.#socket.subdomains);
      for (let i = 0, len = subdomains?.length; i < len; i++) {
        this.#socket.subdomains[subdomains[i]] ||= new EventEmitter();
        this.#socket.subdomains.on(event, (args) => callback(...args));
      }
      return;
    }
    this.#socket.subdomains[subdomain] ||= new EventEmitter();
    this.#socket.subdomains[subdomain].on(event, (args) => callback(...args));
  }

  #register(type, subdomain, pathname, handler) {
    this.#subdomains[subdomain] ||= { copy: [], delete: [], get: [], move: [], patch: [], post: [], put: [], error: [], page: [], config: [], middleware: [], layout: [] };
    const params = [];
    const route = {
      pathname,
      route: pathname.replace(/:(\w+)/g, (_, param) => (params.push(param), "([^/]+)")).replace(/\*$/, ".*"),
      [["any", "copy", "delete", "get", "move", "patch", "post", "put", "error"].includes(type) ? "handler" : type]: handler,
      params,
      active: true,
    }
    const addRoute = (routes, method) => {
      const existing = findRoute(routes, route.route);
      if (existing) {
        if (this.#strict) throw new Error(`${method} ${subdomain !== "" ? "for subdomain \"" + subdomain + "\"" : ""} path "${pathname}" already exists.`);
        return assign(existing, route);
      }
      const segments = pathname.split("/");
      for (let i = 0, len = routes.length; i < len; i++) {
        if (checkIfMoreSpecific(segments, routes[i].pathname))
          return routes.splice(i, 0, route), route;
      }
      return routes.push(route), route;
    }

    if (type === "any") {
      for (let i = 0, len = ANY_METHODS.length; i < len; i++) addRoute(this.#subdomains[subdomain][ANY_METHODS[i]], ANY_METHODS[i].toUpperCase());
      return null;
    }
    return addRoute(this.#subdomains[subdomain][type], type.toUpperCase());
  }

  #reject(request, response, message, code) {
    response.message = message || `The requested ${request.resource ? "Resource" : "URL"} "${request.url}" was not found`;
    response.code = code || 404;
    response.send = (content, type) => (
      typeof content === "object" ? send(request, response, response.code, stringify(content), type || "application/json") : send(request, response, response.code, content, type)
    );
    const route = matchRoute(this.#subdomains[request.subdomain]?.error, request.url);
    if (route) return route.handler(request, response);
    send(request, response, response?.code, response?.message);
  }

  #handler(request, response) {
    if (request.url.endsWith("/") && request.url !== "/") {
      response.writeHead(301, { Location: request.url.slice(0, -1) });
      response.end();
      return;
    }
    const method = request.method.toLowerCase();
    request.subdomain = getSubdomain(request.headers.referer || request.headers.host);
    request.resource = fs.extname(request.url) !== "";
    request.cookies = {};
    if (request?.headers?.cookie) {
      const cookies = request?.headers?.cookie.split(";");
      for (let i = 0, len = cookies?.length; i < len; i++) {
        const parts = cookies[i].split("=");
        const name = parts.shift().trim();
        request.cookies[name] = decodeURIComponent(parts.join("=").trim());
      }
    }
    response.reject = (message, code) => this.#reject(request, response, message, code);
    response.redirect = (url) => (response.writeHead(301, { Location: url }), response.end());
    response.send = (content, type) => (
      typeof content === "object" ? send(request, response, 200, stringify(content), type || "application/json") : send(request, response, 200, content, type)
    );

    try {
      if (request.url.startsWith(`/${RESOURCES_PATH}/`) && request.resource) {
        const resource = this.#resources?.[request.subdomain]?.[request.url];
        if (method === "get" && resource)
          return response.send(resource, mime.getType(request.url) || "application/octet-stream");
      }
      else {
        const route = matchRoute(this.#subdomains[request.subdomain][method], request.url);
        if (route) {
          request.params = {};
          route.params.forEach((param, index) => request.params[param] = route.match[index + 1]);
          return route.handler(request, response);
        }
      }
      this.#reject(request, response);
    }
    catch (e) {
      console.error(e.stack);
      this.#reject(request, response, e.message, 500);
    }
  }

  async #socketHandler(socket) {
    const subdomain = getSubdomain(socket.handshake.headers.referer) || "";
    await socket.join(subdomain);
    this.#socket.subdomains[subdomain] ||= new EventEmitter();
    socket.onAny((event, ...args) => this.#socket.subdomains[subdomain].emit(event, args));
  }

  async #build(folder, options, callback) {
    this.#isBuild = true;
    await this.use("build", "/", folder);
    if (options === true || typeof options === "string") options = { output: options };
    if (options.output === true) options.output = ".build";
    const output = ".build";
    const files = {};
    const createFile = async (file, content) => {
      const len = content.length;
      if (len === 0) return;
      const filepath = fs.resolve(output, "." + file);
      file = filepath.replace(fs.resolve(output), "");
      if (options?.write === false) {
        files[file] = content;
        callback?.(null, file);
        return;
      }
      await fs.writeFile(filepath, content);
      callback?.(filepath, file, fs.statSync(filepath).size);
    };

    const pages = this.#subdomains.build.page;
    for (let i = 0, len = pages.length; i < len; i++) {
      const page = pages[i].page;
      if (page.pathname.includes(":")) continue;
      await fs.mkdir(fs.resolve(output, "." + page.pathname), { recursive: true });
      await createFile(page.pathname + "/index.html", page.html({}, {}, this.#isBuild));
      await createFile(page.pathname + "/script.js", page.js());
      await createFile(page.pathname + "/style.css", page.css());
    }

    const resources = Object.keys(this.#resources.build);
    for (let i = 0, len = resources.length; i < len; i++) {
      const filepath = resources[i];
      await fs.mkdir(fs.resolve(output, "./" + RESOURCES_PATH), { recursive: true });
      await createFile(filepath, this.#resources.build[filepath]);
    }

    return options?.write === false ? files : true;
  }
}

export default Server;

//

function parseArguments(method, subdomain, pathname, arg) {
  if (typeof subdomain !== "string") throw new TypeError(`Invalid arguments for ${method.toUpperCase()} "${pathname}"`);
  if (!arg) arg = pathname, pathname = subdomain, subdomain = "";
  if (!arg) throw new TypeError(`Invalid arguments for ${method.toUpperCase()} "${pathname}"`);
  if (
    subdomain !== "" &&
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)
  ) throw new TypeError(`Invalid subdomain for "${subdomain}"`);
  if (!pathname) throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === '/') throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  if (!/^\/(?!.*\/\/)(?!.*\.\.)([a-zA-Z0-9\-_.:*/]*)$/.test(pathname) || /([^/]:)|([^/]\*)|(\*[^/])/.test(pathname)) throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  return [subdomain, pathname, arg];
}

function getSubdomain(input) {
  if (isIPAddress(input)) return "";
  const match = input.match(/^(?:https?:\/\/)?(?:www\.)?([^/:?]+)/i);
  const parts = (match && match[1] ? match[1] : input).split(".");
  if (parts[0] === "www") parts.shift();
  const isLocal = parts.includes("localhost");
  if (parts.length > (isLocal ? 1 : 2)) return parts[0];
  return "";
}

function matchRoute(routes, pathname, { exact, filter } = {}) {
  exact = exact !== false ? "$" : "";
  filter ||= (route) => route.active;
  for (let i = 0, len = routes?.length || 0; i < len; i++) {
    routes[i].match = pathname.match(new RegExp("^" + routes[i].route + exact));
    if (routes[i].match && filter(routes[i])) return routes[i];
  }
  return null;
}

function matchRoutes(routes, pathname, callback) {
  const regex = new RegExp("^" + pathname.replace(/:(\w+)/g, "([^/]+)").replace(/\*$/, ".*"));
  for (let i = 0, len = routes.length; i < len; i++) {
    if (routes[i].pathname.match(regex)) callback(routes[i]);
  }
}

function findRoute(routes, route) {
  for (let i = 0, len = routes.length; i < len; i++) {
    if (routes[i].route === route) return routes[i];
  }
  return null;
}

function combinePathnames(basePathname, relativePathname) {
  return new URL("." + relativePathname, new URL(basePathname + (basePathname.endsWith("/") ? "" : "/"), "file://")).pathname;
}

function send(request, response, code, content, type = "text/plain") {
  const acceptEncoding = request.headers["accept-encoding"];
  const headers = {
    "X-DNS-Prefetch-Control": "off",
    "Expect-CT": "max-age=86400, enforce",
    "X-Frame-Options": "DENY",
    "X-Powered-By": "",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Download-Options": "noopen",
    "X-Content-Type-Options": "nosniff",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Referrer-Policy": "no-referrer",
    "X-XSS-Protection": "1; mode=block",
    "Content-Type": type
  };

  if (!request.headers["x-no-compression"] && acceptEncoding && compressible(type)) {
    if (acceptEncoding.includes("gzip"))
      zlib.gzip(content, (err, buffer) => {
        if (!err) {
          headers["Content-Encoding"] = "gzip";
          response.writeHead(code, headers);
          response.end(buffer);
        }
        else (response.writeHead(code, headers), response.end(content));
      });
    else if (acceptEncoding.includes("deflate"))
      zlib.deflate(content, (err, buffer) => {
        if (!err) {
          headers["Content-Encoding"] = "deflate";
          response.writeHead(code, headers);
          response.end(buffer);
        }
        else (response.writeHead(code, headers), response.end(content));
      });
    else (response.writeHead(code, headers), response.end(content));
  }
  else (response.writeHead(code, headers), response.end(content));
}

function checkIfMoreSpecific(segments, target) {
  const comparedSegments = target.split("/");
  if (segments.length > comparedSegments.length) return true;
  if (segments.length === comparedSegments.length) {
    for (let i = 1, len = segments.length; i < len; i++) {
      const segmentIsDynamic = segments[i].startsWith(":");
      const segmentIsWild = segments[i] === "*";
      const matchedIsDynamic = comparedSegments[i].startsWith(":");
      const matchedIsWild = comparedSegments[i] === "*";
      if (
        (!segmentIsDynamic &&
          !segmentIsWild &&
          (matchedIsDynamic || matchedIsWild)) ||
        (segmentIsDynamic && matchedIsWild) ||
        comparedSegments[i] === ""
      )
        return true;
      if (
        (!matchedIsDynamic &&
          !matchedIsWild &&
          (segmentIsDynamic || segmentIsWild)) ||
        (segmentIsWild && matchedIsDynamic) ||
        segments[i] === ""
      )
        return false;
    }
  }
  return false;
}