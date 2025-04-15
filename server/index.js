import fs from "@vistta/fs";
import { createServer } from "http";
import { createSecureServer } from "http2";
import mime from "mime";
import compressible from "compressible";
import zlib from "zlib";
import proxy from "http-proxy";
import { URL } from "url";
import { EventEmitter } from "node:events";
import { Server as SocketIO } from "socket.io";
import { createPage } from "./page.js";
import { default as Controller, Method, shareToLoader } from "./controller.js";
import {
  RESOURCES_PATH,
  INVALID_EVENT_NAME,
  convertToEventName,
  async,
  isIPAddress,
  stringify,
  ensureEndsWith,
} from "../utils/index.js";

const dirname = import.meta.dirname;

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
  ".cts",
];

const ALL_METHODS = ["copy", "delete", "get", "move", "patch", "post", "put"];
const ACCEPTABLE_FILE_NAMES = [
  "page",
  "error",
  "api",
  "controller",
  "config",
  "middleware",
  "layout",
];

class Route {
  #subdomain;
  #pathname;
  #route;
  #params = [];
  #active = true;
  #page;
  #collection;

  get subdomain() {
    return this.#subdomain;
  }

  get pathname() {
    return this.#pathname;
  }

  get route() {
    return this.#route;
  }

  get params() {
    return this.#params;
  }

  get active() {
    return this.#active;
  }

  get isPage() {
    return this.#page;
  }

  get isCollection() {
    return !!this.#collection;
  }

  constructor(subdomain, pathname, type, handler, page = false) {
    this.#subdomain = subdomain;
    this.#pathname = pathname;
    if (type === "collection") this.#collection = [];
    else {
      this.#route = pathname
        .replace(/:(\w+)/g, (_, param) => (this.#params.push(param), "([^/]+)"))
        .replace(/\*$/, ".*");
      this[
        [
          "all",
          "copy",
          "delete",
          "get",
          "move",
          "patch",
          "post",
          "put",
          "error",
          "middleware",
        ].includes(type)
          ? "handler"
          : type
      ] = handler;
    }
    this.#page = page;
  }

  /**
   * Enables the route
   */
  enable() {
    if (!this.#collection) this.#active = true;
    else
      for (let i = 0, len = this.#collection.length; i < len; i++)
        this.#collection[i].enable();
  }

  /**
   * Disables the route
   */
  disable() {
    if (!this.#collection) this.#active = false;
    else
      for (let i = 0, len = this.#collection.length; i < len; i++)
        this.#collection[i].disable();
  }

  /**
   * Adds a route to a collection
   *
   * @param {Route} route The route to add to the collection
   */
  add(route) {
    if (!this.#collection) throw new TypeError("Route is not a collection");
    this.#collection.push(route);
  }
}

class Server {
  #http;
  #https;
  #strict;
  #events = new EventEmitter();
  #subdomains = {};
  #resources;
  #proxy = proxy.createProxyServer({});
  #socket = {
    server: new SocketIO(),
    subdomains: {},
  };

  get ports() {
    return {
      http: this.#http?.port,
      https: this.#https?.port,
    };
  }

  get certs() {
    return this.#https?.certs;
  }

  get active() {
    return false;
  }

  /**
   * @typedef {Object} Options
   * @property {number | boolean} [http] - Use http or http port
   * @property {number | boolean} [https] - Use https or https port
   * @property {string} [cert] - Certificate filepath
   * @property {string} [key] - Private key filepath
   * @property {boolean} [start] - Start server, default is true
   * @property {boolean} [strict] - Strict routing, default is true
   *
   * @param {Options} [options] - Server options or callback
   */
  constructor({
    http: httpPort,
    https: httpsPort,
    cert,
    key,
    start,
    strict,
  } = {}) {
    if (httpPort === true)
      httpPort = process.env.NODE_ENV === "development" ? 3000 : 80;
    if (httpsPort === true) httpsPort = 443;
    if (!(httpPort || httpsPort))
      throw new Error("Missing ports for either HTTP or HTTPS");
    if (httpsPort && !(cert || key)) {
      httpsPort = null;
      if (!httpPort) throw new Error("Missing certification for HTTPS");
      else
        this.#https = {
          warning: "Disabled HTTPS due to missing certification",
        };
    }
    this.#strict = strict !== false;
    if (httpPort)
      this.#http = {
        name: "http",
        server: createServer(this.#handler.bind(this, "http")),
        port: httpPort,
      };
    if (httpsPort) {
      if (!fs.existsSync(cert) || !fs.existsSync(key))
        this.#https = {
          warning: "Disabled HTTPS due to missing certification",
        };
      else
        this.#https = {
          name: "https",
          server: createSecureServer(
            {
              allowHTTP1: true,
              key: fs.readFileSync(key),
              cert: fs.readFileSync(cert),
            },
            this.#handler.bind(this, "https")
          ),
          port: httpsPort,
          certs: { cert, key },
        };
    }
    this.#socket.server.on("connection", this.#socketHandler.bind(this));
    if (start !== false) this.start();
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
    else return await this.start("http"), await this.start("https"), this.ports;
    if (protocol?.warning) this.#events.emit("warning", protocol.warning);
    if (!protocol?.server) return null;
    if (protocol.active)
      throw new Error(protocol.name.toUpperCase() + " Server already running");
    const { server, port } = protocol;
    await async((resolve) => server.listen(port, resolve));
    this.#socket.server.attach(server);
    shareToLoader("host", { protocol: protocol.name, port });
    protocol.active = true;
    this.#events.emit("ready", { type: protocol.name, port });
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
    else return (await this.stop("http")) && (await this.stop("https"));
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
   * @returns {Route} The route object
   */
  copy(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "copy",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("copy", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP DELETE requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  delete(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "delete",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("delete", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP GET requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  get(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "get",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("get", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP MOVE requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  move(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "move",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("move", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP PATCH requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  patch(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "patch",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("patch", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP POST requests to the specified pathname and subdomain with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  post(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "post",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("post", subdomain, pathname, handler);
  }

  /**
   * Routes HTTP PUT requests to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  put(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "put",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("put", subdomain, pathname, handler);
  }

  /**
   * Routes all HTTP requests to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  all(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "put",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("all", subdomain, pathname, handler);
  }

  /**
   * Routes any HTTP error to the specified subdomain and pathname with the specified handler function.
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname or handler function
   * @param {Function} [arg3] - Route handler function
   * @returns {Route} The route object
   */
  error(arg1, arg2, arg3) {
    const [subdomain, pathname, handler] = parseArguments(
      "put",
      arg1,
      arg2,
      arg3
    );
    if (typeof handler !== "function")
      throw new TypeError("Invalid argument type");
    return this.#register("error", subdomain, pathname, handler);
  }

  /**
   * Uses a folder structure, a file or a middleware as the basis for defining different types of routes
   *
   * @param {string} arg1 - Route subdomain or pathname
   * @param {string | Function} arg2 - Route pathname, directory or handler or function
   * @param {string | Function} [arg3] - Directory, file, handler or function
   * @returns {Promise<Route>} The route object
   */
  async use(arg1, arg2, arg3) {
    const [subdomain, basepath, target] = parseArguments(
      "use",
      arg1,
      arg2,
      arg3
    );
    const typeOfTarget = typeof target;
    if (typeOfTarget === "function")
      return this.#register("middleware", subdomain, basepath, target);
    else if (typeOfTarget !== "string")
      throw new TypeError("Invalid argument type");
    const collection = new Route(subdomain, basepath, "collection");
    if (!fs.isDirectory(target)) {
      await this.#use("page", collection, subdomain, basepath, target);
      return collection;
    }
    const entries = await fs.readdir(target, { recursive: true });
    for (let i = 0, len = entries.length; i < len; i++) {
      const entry = entries[i].replace(/\\/g, "/");
      const filepath = fs.resolve(target, entry);
      const extname = fs.extname(filepath);
      const isResource = fs.contains(filepath, RESOURCES_PATH);
      if (
        fs.isDirectory(filepath) ||
        !(JAVASCRIPT_TYPESCRIPT_EXTENSIONS.includes(extname) || isResource)
      )
        continue;
      const paths = entry.replace(/\.[^.]+$/, "").split("/");
      const pathsLen = paths.length;
      if (pathsLen == 1 && !isResource) {
        await this.#use(
          paths[0],
          collection,
          subdomain,
          combinePathnames(basepath, "/"),
          filepath
        );
        continue;
      }
      let pathname = "";
      for (let i2 = 0; i2 < pathsLen; i2++) {
        const path = paths[i2];
        if (i2 == pathsLen - 1) break;
        if (!path.endsWith("]")) pathname += "/" + path;
        else if (path.startsWith("[...")) {
          pathname += "/*";
          break;
        } else if (path.startsWith("[")) pathname += "/:" + path.slice(1, -1);
        else pathname += "/" + path.slice(0, -1);
      }
      if (isResource)
        this.#resources[
          combinePathnames(basepath, pathname) + "/" + fs.basename(filepath)
        ] = filepath;
      else
        await this.#use(
          paths[pathsLen - 1],
          collection,
          subdomain,
          combinePathnames(basepath, pathname),
          filepath
        );
    }
    return collection;
  }

  async #use(type, collection, subdomain, pathname, filepath, arg, emit) {
    if (!ACCEPTABLE_FILE_NAMES.includes(type)) return;
    try {
      if (
        !arg &&
        ["api", "controller", "config", "middleware", "layout"].includes(type)
      )
        arg = (await import(filepath))?.default;
      if (type === "config") {
        if (typeof arg !== "object") throw new TypeError("Invalid config type");
        const config = this.#register(
          "config",
          subdomain,
          ensureEndsWith(pathname, "/"),
          arg
        );
        const segments = pathname.split("/");
        matchRoutes(
          this.#subdomains[subdomain]?.page || [],
          pathname,
          ({ page }) => {
            const configs = page.inherited.configs;
            for (let i = 0, len = configs.length; i < len; i++) {
              if (checkIfMoreSpecific(segments, configs[i].pathname))
                return configs.splice(i, 0, config);
            }
            collection.add(config);
            configs.push(config);
            page.cache.reset();
          }
        );
      } else if (type === "layout") {
        if (typeof arg !== "function")
          throw new TypeError("Invalid layout type");
        const layout = this.#register(
          "layout",
          subdomain,
          ensureEndsWith(pathname, "/"),
          {
            pathname,
            component: arg,
            code: (
              await import(filepath, {
                with: {
                  type: "bundler",
                  globalName: "__app_layout_component",
                  exports: "default",
                },
              })
            )?.code,
          }
        );
        const segments = pathname.split("/");
        matchRoutes(
          this.#subdomains[subdomain]?.page || [],
          pathname,
          ({ page }) => {
            if (
              page.inherited.layout &&
              !checkIfMoreSpecific(segments, page.inherited.layout.pathname)
            )
              return;
            page.inherited.layout = layout;
            page.cache.reset();
          }
        );
        collection.add(layout);
      } else if (type === "page" || type === "error") {
        const configs = [];
        const segments = pathname.split("/");
        for (
          let i = 0, len = pathname === "/" ? 1 : segments.length;
          i < len;
          i++
        ) {
          const config = matchRoute(
            this.#subdomains[subdomain]?.config || [],
            segments.slice(0, i + 1).join("/") || "/"
          );
          if (config) configs.push(config);
        }
        const page = await createPage(
          type,
          filepath,
          pathname,
          configs,
          matchRoute(this.#subdomains[subdomain]?.layout || [], pathname, {
            exact: false,
            filter: (route) => route.layout,
          })
        );
        if (!this.#resources)
          this.#resources = {
            [`/${RESOURCES_PATH}/client.js`]: (
              await import(fs.resolve(dirname, "./client.js"), {
                with: { type: "bundler" },
              })
            )?.code,
            [`/${RESOURCES_PATH}/worker.js`]: (
              await import(fs.resolve(dirname, "./worker.js"), {
                with: { type: "bundler" },
              })
            )?.code,
          };
        const resourceKeys = Object.keys(page.resources);
        for (
          let i2 = 0, resourcesLen = resourceKeys.length;
          i2 < resourcesLen;
          i2++
        )
          this.#resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] =
            page.resources[resourceKeys[i2]];
        if (type === "error") {
          collection.add(
            this.#register(
              "page",
              subdomain,
              ensureEndsWith(pathname, "/❌"),
              page
            )
          );
          collection.add(
            this.#register(
              "error",
              subdomain,
              pathname,
              (req, res, code, message) => {
                if (req.resource === "page")
                  page
                    .js(req, { code, message })
                    .then((js) => res.send(js, "text/javascript"));
                else if (req.resource === "manifest")
                  res.reject("Resource not found", 404);
                else
                  page
                    .html(req, { code, message })
                    .then((html) => res.send(html, "text/html"));
              },
              true
            )
          );
        } else {
          collection.add(
            this.#register(
              "page",
              subdomain,
              ensureEndsWith(pathname, "/"),
              page
            )
          );
          if (page.config)
            this.#use(
              "config",
              collection,
              subdomain,
              pathname,
              filepath,
              page.config,
              false
            );
          collection.add(
            this.#register(
              "get",
              subdomain,
              pathname,
              (req, res) => {
                if (req.resource === "page")
                  page
                    .js(req, res.props)
                    .then((js) => res.send(js, "text/javascript"));
                else if (req.resource === "manifest") {
                  if (page.pwa)
                    page
                      .manifest(req, req.props)
                      .then((manifest) => res.send(manifest, "text/json"));
                  else res.reject("Resource not found", 404);
                } else
                  page
                    .html(req, res.props)
                    .then((html) => res.send(html, "text/html"));
              },
              true
            )
          );
        }
      } else if (type === "api" || type === "controller") {
        shareToLoader(filepath, { subdomain, pathname: "/api" + pathname });
        collection.add(this.#register(type, subdomain, "/api" + pathname, arg));
      } else collection.add(this.#register(type, subdomain, pathname, arg));
      if (emit != false)
        this.#events.emit("ready", { type, subdomain, pathname });
    } catch (e) {
      this.#events.emit("error", e);
    }
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
   * @returns {Route} The route object
   */
  proxy(arg1, arg2, arg3) {
    const [subdomain, pathname, targetOrOptions] = parseArguments(
      "proxy",
      arg1,
      arg2,
      arg3
    );
    const typeOfTargetOrOptions = typeof targetOrOptions;
    if (
      typeOfTargetOrOptions !== "object" &&
      typeOfTargetOrOptions !== "string"
    )
      throw new TypeError("Invalid argument type");
    const options =
      typeOfTargetOrOptions === "string"
        ? {
            ws: true,
            xfwd: true,
            secure: false,
            changeOrigin: true,
            target: targetOrOptions,
          }
        : {
            ws: true,
            xfwd: true,
            secure: false,
            changeOrigin: true,
            ...targetOrOptions,
          };
    return this.#register(
      "all",
      subdomain,
      ensureEndsWith(pathname, "/*"),
      (req, res) =>
        this.#proxy.web(req, res, options, (err) =>
          res.reject(err?.message, 500)
        )
    );
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
   * @returns {Route} The route object
   */
  redirect(arg1, arg2, arg3) {
    const [subdomain, pathname, target] = parseArguments(
      "redirect",
      arg1,
      arg2,
      arg3
    );
    const typeOfTarget = typeof target;
    if (typeOfTarget !== "object" && typeOfTarget !== "string")
      throw new TypeError("Invalid argument type");
    const baseUrl =
      typeOfTarget === "string" ? typeOfTarget : typeOfTarget?.target;
    return this.#register(
      "all",
      subdomain,
      ensureEndsWith(pathname, "/*"),
      (req, res) =>
        res.redirect(new URL(req.url || "/", baseUrl).toString(), true)
    );
  }

  /**
   * Listens for an event on all connected sockets in a subdomain or globally.
   *
   * @param {string} arg1 The subdomain or event. If subdomain not specified, the listener will be attached to all sockets.
   * @param {string | Function} arg2 The name of the event to listen for or callback function.
   * @param {Function} [arg3] A function to call when the event is triggered.
   */
  on(arg1, arg2, arg3) {
    if (!arg1 || !arg2)
      throw new TypeError("Invalid argument type, on and event and callback");
    const [subdomain, event, callback] =
      typeof arg2 === "function"
        ? ["*", convertToEventName(arg1), arg2]
        : [arg1, convertToEventName(arg2), arg3];
    if (!event) return this.#events.emit("warning", INVALID_EVENT_NAME), null;
    if (subdomain === "*") {
      if (event === "ready" || event === "warning" || event === "error")
        return this.#events.on(event, callback);

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

  /**
   * Emits an event to all connected sockets in a subdomain or globally.
   *
   * @param {string} subdomain The subdomain of the socket to emit to. If not specified, the event will be emitted globally.
   * @param {string} event The name of the event to emit.
   * @param {...any} args Additional arguments to pass to the event listener.
   */
  emit(subdomain, event, ...args) {
    if (typeof event !== "string")
      return this.#events.emit("warning", "Cannot emit an empty event");
    if (subdomain && subdomain !== "*")
      this.#socket.server.to(subdomain).emit(event, ...args);
    else this.#socket.server.emit(event, ...args);
  }

  /**
   * Builds a static site from a subdomain or all of them to the specified output directory.
   *
   * @param {string} arg1 The subdomain to build from or the output directory.
   * @param {string} [arg2] The output directory.
   */
  async build(arg1, arg2) {
    const [subdomain, output] = arg2 ? [arg1, arg2] : ["", arg1];
    const files = {};
    const createFile = async (file, content) => {
      const len = content.length;
      if (len === 0) return;
      const filepath = fs.resolve(output, "." + file);
      file = filepath.replace(fs.resolve(output), "");
      await fs.ensureDir(fs.dirname(filepath));
      await fs.writeFile(filepath, content);
      files[file] = { filepath, len };
    };

    const pages = this.#subdomains[subdomain]?.page || [];
    for (let i = 0, len = pages.length; i < len; i++) {
      const page = pages[i].page;
      if (page.pathname.includes(":")) continue;
      await fs.ensureDir(fs.resolve(output, "." + page.pathname));
      await createFile(
        page.pathname + "/index.html",
        await page.html({ headers: { host: "localhost" } }, {}, true)
      );
      await createFile(page.pathname + "/page.js", await page.js({}, {}));
    }

    const resources = Object.keys(this.#resources || {});
    await fs.ensureDir(fs.resolve(output, "./" + RESOURCES_PATH));
    for (let i = 0, len = resources.length; i < len; i++) {
      const filepath = resources[i];
      let content = this.#resources[filepath];
      if (filepath === `/${RESOURCES_PATH}/client.js`)
        content = (
          await import(fs.resolve(dirname, "./build/client.js"), {
            with: { type: "bundler" },
          })
        )?.code;
      else if (fs.isAbsolute(content)) content = await fs.readFile(content);
      await createFile(filepath, content);
    }
    return files;
  }

  #register(type, subdomain, pathname, arg, page) {
    if (type === "api") {
      if (Object.isPrototypeOf.call(Controller, arg))
        return this.#register("controller", subdomain, pathname, arg);
      else if (arg instanceof Method)
        return this.#register(
          arg.type,
          subdomain,
          pathname,
          async (req, res) => {
            try {
              const value = await arg.handler(req, res);
              if (!res.writableEnded) res.send(value);
            } catch (e) {
              res.reject(e.message, 500);
            }
          }
        );
      else if (typeof handler === "function")
        return this.#register("all", subdomain, pathname, arg);
      else throw new TypeError("Invalid api type");
    }
    if (type === "controller") {
      if (!Object.isPrototypeOf.call(Controller, arg))
        throw new TypeError("Invalid controller type");
      const socket = {
        emit: this.emit.bind(this, subdomain),
        on: this.on.bind(this, subdomain),
      };
      const handlers = Object.values(new arg(socket));
      for (let i = 0, len = handlers.length; i < len; i++) {
        const handler = handlers[i];
        if (!(handler instanceof Method)) continue;
        const handlerPathname = combinePathnames(pathname, handler.url);
        this.#register(
          handler.type,
          subdomain,
          handlerPathname,
          async (req, res) => {
            try {
              const value = await handler(req, res);
              if (!res.writableEnded) res.send(value);
            } catch (e) {
              res.reject(e.message, 500);
            }
          }
        );
      }
      return null;
    }
    if (type === "all") {
      const route = new Route(subdomain, pathname, type, arg);
      for (let i = 0, len = ALL_METHODS.length; i < len; i++)
        this.#register(ALL_METHODS[i], subdomain, pathname, route);
      return route;
    }

    this.#subdomains[subdomain] ||= defaultSubdomain();
    const route =
      arg instanceof Route
        ? arg
        : new Route(subdomain, pathname, type, arg, page);
    const routes = this.#subdomains[subdomain][type];
    const { route: existing, replace } = findRoute(routes, route.route) || {};
    if (existing) {
      if (this.#strict)
        throw new Error(
          `${type.toUpperCase()} ${subdomain !== "" ? 'for subdomain "' + subdomain + '"' : ""} path "${pathname}" already exists.`
        );
      return replace(route);
    }
    const segments = pathname.split("/");
    for (let i = 0, len = routes.length; i < len; i++) {
      if (checkIfMoreSpecific(segments, routes[i].pathname))
        return routes.splice(i, 0, route), route;
    }
    return routes.push(route), route;
  }

  async #handler(protocol, request, response) {
    if (request.url.endsWith("/") && request.url !== "/") {
      response.writeHead(301, { Location: request.url.slice(0, -1) });
      response.end();
      return;
    }
    if (protocol === "https" && request.headers[":authority"])
      request.headers.host = request.headers[":authority"];
    if (!request.headers.host) throw new Error("Missing host header");
    request.protocol = protocol;
    request.subdomain = getSubdomain(request.headers.host);
    request.resource = fs.extname(request.url) !== "";
    const url = new URL(
      request.url,
      `${request.protocol}://${request.headers.host}`
    );
    request.href = url.href;
    request.pathname = url.pathname;
    request.params = Object.fromEntries(url.searchParams.entries());
    request.body = await getRequestBody(request);
    request.cookies = {};
    if (request?.headers?.cookie) {
      const cookies = request?.headers?.cookie.split(";");
      for (let i = 0, len = cookies?.length; i < len; i++) {
        const parts = cookies[i].split("=");
        const name = parts.shift().trim();
        request.cookies[name] = decodeURIComponent(parts.join("=").trim());
      }
    }
    response.cookies = {};
    response.props = {};
    response.set = (type, ...args) => {
      switch (type) {
        case "cookie":
          response.cookies[args[0]] = {
            value: args[1] || "",
            options: args[2] || {},
          };
          break;
        case "cookies":
          Object.assign(response.cookies, args[0] || {});
          break;
        case "props":
          Object.assign(response.props, args[0] || {});
          break;
        default:
          break;
      }
    };
    response.reject = (message, code) =>
      this.#reject(request, response, message, code);
    response.redirect = (url, permanent) => (
      response.writeHead(permanent ? 301 : 302, { Location: url }),
      response.end()
    );
    response.send = (content, type) =>
      typeof content === "object"
        ? send(
            request,
            response,
            200,
            stringify(content),
            type || "application/json"
          )
        : send(request, response, 200, content, type);
    response.sendFile = (filepath, type) =>
      sendFile(request, response, filepath, type);
    const middleware = matchRoute(
      this.#subdomains[request.subdomain]?.middleware,
      request.pathname
    );
    if (middleware)
      middleware.handler(request, response, () =>
        this.#resolve(request, response)
      );
    else this.#resolve(request, response);
  }

  async #resolve(request, response) {
    try {
      const method = request.method.toLowerCase();
      const resource = this.#resources?.[request.pathname];
      if (request.resource && resource) {
        if (method !== "get")
          return this.#reject(request, response, "Method not allowed", 405);
        const type =
          mime.getType(request.pathname) || "application/octet-stream";
        if (fs.isAbsolute(resource)) return response.sendFile(resource, type);
        return response.send(resource, type);
      } else {
        if (request.pathname.endsWith("/page.js"))
          (request.resource = "page"),
            (request.pathname = removeFromPath(request.pathname, "/page.js"));
        if (request.pathname.endsWith("manifest.json"))
          (request.resource = "manifest"),
            (request.pathname = removeFromPath(
              request.pathname,
              "/manifest.json"
            ));
        const route = matchRoute(
          this.#subdomains[request.subdomain]?.[method],
          request.pathname
        );
        if (route) {
          route.params.forEach(
            (param, index) => (request.params[param] = route.match[index + 1])
          );
          return route.handler(request, response);
        }
      }
      this.#reject(request, response);
    } catch (e) {
      this.#events.emit("error", e);
      this.#reject(request, response, e.message, 500);
    }
  }

  #reject(request, response, message, code) {
    response.message =
      message ||
      `The requested ${request.resource ? "Resource" : "URL"} "${request.url}" was not found`;
    response.code = code || 404;
    response.send = (content, type) =>
      typeof content === "object"
        ? send(
            request,
            response,
            response.code,
            stringify(content),
            type || "application/json"
          )
        : send(request, response, response.code, content, type);
    const acceptsHtml =
      request.headers.accept && request.headers.accept.includes("text/html");
    let route = matchRoute(
      this.#subdomains[request.subdomain]?.error,
      request.pathname,
      {
        exact: false,
        filter: (route) => route.active && (acceptsHtml || !route.isPage),
      }
    );
    if (route)
      return route.handler(
        request,
        response,
        response?.code,
        response?.message
      );
    if (request.subdomain === "")
      return send(request, response, response?.code, response?.message);
    route = matchRoute(this.#subdomains[""]?.error, request.pathname, {
      exact: false,
      filter: (route) => route.active && (acceptsHtml || !route.isPage),
    });
    if (route)
      return route.handler(
        request,
        response,
        response?.code,
        response?.message
      );
    send(request, response, response?.code, response?.message);
  }

  async #socketHandler(socket) {
    const subdomain = getSubdomain(socket.handshake.headers.referer) || "";
    await socket.join(subdomain);
    this.#socket.subdomains[subdomain] ||= new EventEmitter();
    socket.onAny((event, ...args) =>
      this.#socket.subdomains[subdomain].emit(event, args)
    );
  }
}

export default Server;

//

function parseArguments(method, subdomain, pathname, arg) {
  if (typeof subdomain !== "string")
    throw new TypeError(
      `Invalid arguments for ${method.toUpperCase()} "${pathname}"`
    );
  if (!arg) (arg = pathname), (pathname = subdomain), (subdomain = "");
  if (!arg)
    throw new TypeError(
      `Invalid arguments for ${method.toUpperCase()} "${pathname}"`
    );
  if (
    subdomain !== "" &&
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)
  )
    throw new TypeError(`Invalid subdomain for "${subdomain}"`);
  if (!pathname)
    throw new TypeError(
      `Invalid pathname for ${method.toUpperCase()} "${pathname}"`
    );
  if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === "/")
    throw new TypeError(
      `Invalid pathname for ${method.toUpperCase()} "${pathname}"`
    );
  if (
    !/^\/(?!.*\/\/)(?!.*\.\.)([a-zA-Z0-9\-_.:*/]*)$/.test(pathname) ||
    /([^/]:)|([^/]\*)|(\*[^/])/.test(pathname)
  )
    throw new TypeError(
      `Invalid pathname for ${method.toUpperCase()} "${pathname}"`
    );
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
  const regex = new RegExp(
    "^" + pathname.replace(/:(\w+)/g, "([^/]+)").replace(/\*$/, ".*")
  );
  for (let i = 0, len = routes.length; i < len; i++) {
    if (routes[i].pathname.match(regex)) callback(routes[i]);
  }
}

function findRoute(routes, route) {
  for (let i = 0, len = routes.length; i < len; i++) {
    if (routes[i].route === route)
      return {
        route: routes[i],
        replace: (newRoute) => ((routes[i] = newRoute), newRoute),
      };
  }
  return null;
}

function combinePathnames(basePathname, relativePathname) {
  const pathname = new URL(
    "." + relativePathname,
    new URL(basePathname + (basePathname.endsWith("/") ? "" : "/"), "file://")
  ).pathname;
  return pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;
}

function removeFromPath(urlPath, target) {
  if (urlPath === target) return "/";
  return urlPath.replace(new RegExp(target + "$"), "");
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (data) => (body += data));
    request.on("end", () => {
      try {
        body = JSON.parse(body);
      } catch {
        /* Do Nothing */
      }
      resolve(body);
    });
    request.on("error", (err) => reject(err));
  });
}

function sendFile(request, response, filepath, type) {
  const stream = fs.createReadStream(filepath);
  const headers = defaultHeaders(request, response, type);
  response.writeHead(200, headers);
  stream.pipe(response);
  stream.on("error", () => {
    response.writeHead(500, headers);
    response.end("500 Internal Server Error");
  });
}

function send(request, response, code, content, type = "text/plain") {
  const acceptEncoding = request.headers["accept-encoding"];
  const headers = defaultHeaders(request, response, type);
  if (
    !request.headers["x-no-compression"] &&
    acceptEncoding &&
    compressible(type)
  ) {
    if (acceptEncoding.includes("gzip"))
      zlib.gzip(content, (err, buffer) => {
        if (!err) {
          headers["Content-Encoding"] = "gzip";
          response.writeHead(code, headers);
          response.end(buffer);
        } else response.writeHead(code, headers), response.end(content);
      });
    else if (acceptEncoding.includes("deflate"))
      zlib.deflate(content, (err, buffer) => {
        if (!err) {
          headers["Content-Encoding"] = "deflate";
          response.writeHead(code, headers);
          response.end(buffer);
        } else response.writeHead(code, headers), response.end(content);
      });
    else response.writeHead(code, headers), response.end(content);
  } else response.writeHead(code, headers), response.end(content);
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

function defaultHeaders(request, response, type) {
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
    "Content-Type": type,
    "Cache-Control":
      process.env.NODE_ENV === "production" && request.resource
        ? "public, max-age=31536000"
        : "no-cache, no-store, must-revalidate",
  };
  const cookies = Object.keys(response.cookies);
  if (cookies.length > 0) {
    let setCookies = "";
    for (let i = 0, len = cookies.length; i < len; i++) {
      const cookie = response.cookies[cookies[i]];
      let value = `${cookies[i]}=${cookie.value}; SameSite=${cookie.options.sameSite || "Strict"}; Path=${cookie.options.path || "/"}; `;
      if (cookie.options.expires)
        value += `; Expires=${cookie.options.expires}`;
      if (cookie.options.maxAge) value += `; Max-Age=${cookie.options.maxAge}`;
      if (cookie.options.domain) value += `; Domain=${cookie.options.domain}`;
      if (cookie.options.secure) value += `; Secure`;
      if (cookie.options.httpOnly !== false) value += `; HttpOnly`;
      setCookies += value + "; ";
    }
    headers["Set-Cookie"] = setCookies;
  }
  return headers;
}

function defaultSubdomain() {
  return {
    copy: [],
    delete: [],
    get: [],
    move: [],
    patch: [],
    post: [],
    put: [],
    error: [],
    page: [],
    config: [],
    middleware: [],
    layout: [],
  };
}
