import fs from "@vistta/fs";
import compressible from "compressible";
import { createServer } from "http";
import proxy from "http-proxy";
import { createSecureServer } from "http2";
import mime from "mime";
import { Server as SocketIO } from "socket.io";
import { URL } from "url";
import zlib from "zlib";
import {
  addToPathname,
  async,
  checkIfMoreSpecific,
  ensureEndsWith,
  findRoutes,
  isIPAddress,
  matchRoute,
  removeFromPathname,
  RESOURCES_PATH,
  stringify,
  traverse,
} from "../utils/index.js";
// @ts-ignore bundler attribute injects virtual "code" export
import { code as client } from "../clients/ssr.js" with { type: "bundler" };
import { Component, createPage } from "../core/page.js";
// @ts-ignore bundler attribute compiles worker source as string code
import { code as worker } from "../core/worker.js" with { type: "bundler" };
import { default as Controller, RESTMethod, shareToLoader } from "./controller.js";

const TIMEOUT_TIME = 5 * 60 * 1000; // 5 minutes
const BODY_IDLE_TIMEOUT_TIME = 15 * 1000; // 15 seconds
const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_PROXY_OPTIONS = {
  ws: true,
  secure: false,
  changeOrigin: true,
  preserveHeaderKeyCase: true,
  selfHandleResponse: false,
  followRedirects: false,
  timeout: TIMEOUT_TIME,
  proxyTimeout: TIMEOUT_TIME,
};

const ALL_METHODS = ["copy", "delete", "get", "head", "move", "options", "patch", "post", "put"];

/**
 * @typedef {import("node:http").IncomingMessage & {
 *   protocol: string, port: number, address: string, subdomain: string,
 *   resource: boolean|string, href: string, pathname: string,
 *   params: Record<string, string>, cookies: Record<string, string>, body: () => Promise<any>
 * }} Request
 */

/**
 * @typedef {import("node:http").ServerResponse & {
 *   cookies: string[], props: Record<string, any>, headers: Record<string, any>,
 *   rejected?: boolean, message?: string,
 *   set: (type: string, ...args: any[]) => void,
 *   reject: (message?: string, code?: number) => void,
 *   redirect: (url: string, permanent?: boolean) => void,
 *   send: (content: any, type?: string) => void,
 *   sendFile: (filepath: string, type?: string, options?: object) => void
 * }} Response
 */

/**
 * @callback Handler
 * @param {Request} request
 * @param {Response} response
 * @param {...any} args
 * @returns {any}
 */

/**
 * @typedef {{
 *   get: {
 *     (type: "subdomains"): string[],
 *     (type: string, pathname: `/${string}`): Route|undefined,
 *     (type: string, subdomain?: string): Route[],
 *     (type: string, subdomain: string, pathname: string): Route|undefined
 *   },
 *   set: {
 *     (type: string, pathname: string, handler: Handler|string|object): Route,
 *     (type: string, subdomain: string, pathname: string, handler: Handler|string|object): Route
 *   },
 *   use: {
 *     (pathname: string, target: string|Handler|object): Promise<Route>,
 *     (subdomain: string, pathname: string, target: string|Handler|object): Promise<Route>
 *   }
 * }} RouteRegistry
 */

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
        .replace(/\/:(\w+)$/, "(?:/:$1)?")
        .replace(/:(\w+)/g, (_, param) => (this.#params.push(param), "([^/]+)"))
        .replace(/\*$/, ".*");
      if (this.#params.length) this.#route += "/?";
      this[["page", "config", "layout"].includes(type) ? type : "handler"] = handler;
    }
    this.#page = page;
  }

  /**
   * Enables the route
   */
  enable() {
    if (!this.#collection) this.#active = true;
    else for (let i = 0, len = this.#collection.length; i < len; i++) this.#collection[i].enable();
  }

  /**
   * Disables the route
   */
  disable() {
    if (!this.#collection) this.#active = false;
    else for (let i = 0, len = this.#collection.length; i < len; i++) this.#collection[i].disable();
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
  #events = {};
  #subdomains = {};
  #resources = {
    [`/${RESOURCES_PATH}/client.js`]: client,
  };
  #proxy = proxy.createProxyServer({});
  #socket;
  #origins = new Set(["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"]);
  #timeout;

  get ports() {
    return {
      http: this.#http?.port,
      https: this.#https?.port,
    };
  }

  get certs() {
    return this.#https?.certs;
  }

  /**
   * @typedef {Object} ProxyOptions
   * @property {string} target - Target url
   * @property {boolean} [ws=true] - Include websocket
   * @property {boolean} [secure=false] - Allow only https
   * @property {boolean} [changeOrigin=false] - Change origin
   * @property {boolean} [preservePathname=false] - Preserve pathname in the target url
   */

  /**
   * @typedef {Object} RedirectOptions
   * @property {string} target - Target url
   * @property {boolean} [preservePathname=false] - Preserve pathname in the target url
   */

  /**
   * @typedef {"subdomains"|"copy"|"delete"|"get"|"head"|"move"|"options"|"patch"|"post"|"put"|"all"|"middleware"|"websocket"|"api"|"controller"|"page"|"error"|"config"|"layout"|"redirect"|"proxy"} RouteType
   * @typedef {Function|string|Object} RouteHandler
   * @typedef {Object} RouteRegistry
   * @property {(arg1: string, arg2?: string, arg3?: string) => string[] | Route[] | Route | null} get
   * @property {(arg1: string, arg2: string|RouteHandler, arg3?: string|RouteHandler, arg4?: RouteHandler) => Route | null} set
   * @property {(arg1: string, arg2: string|Function, arg3?: string|Function|Object) => Promise<Route>} use
   */

  /**
   * Direct access to the route registry.
   *
   * All three methods share the same flexible argument convention as the
   * former `use`: pass `(subdomain, pathname, ...)` or just `(pathname, ...)`
   * — when the subdomain is omitted it defaults to `""`. The subdomain and
   * pathname are validated via `parseArguments`.
   *
   * - `routes.get("subdomains")` lists subdomains; `routes.get(type, ...)` reads routes.
   * - `routes.set(type, ...)` registers HTTP method handlers, middleware, websockets,
   *   pages/configs/layouts, and `redirect`/`proxy` routes. For `redirect`
   *   the handler is a target url string or `RedirectOptions`; for `proxy`
   *   a target url string or `ProxyOptions`.
   * - `routes.use(...)` mounts a directory, file, middleware function, or config
   *   object (async, returns a collection `Route`).
   *
   * @type {RouteRegistry}
   */
  get routes() {
    return {
      get: (arg1, arg2 = undefined, arg3 = undefined) => {
        if (arg1 === "subdomains") return Object.keys(this.#subdomains);
        // Flexible arg form: (type, subdomain, pathname) | (type, pathname) | (type, subdomain) | (type).
        // A leading "/" on arg2 marks a pathname on the default subdomain.
        let subdomain = "";
        let pathname;
        if (arg3 !== undefined) ((subdomain = arg2), (pathname = arg3));
        else if (arg2 !== undefined) {
          if (arg2.startsWith("/")) pathname = arg2;
          else subdomain = arg2;
        }
        if (subdomain !== "" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain))
          throw new TypeError(`Invalid subdomain for "${subdomain}"`);
        if (pathname !== undefined) {
          if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === "/")
            throw new TypeError(`Invalid pathname for GET "${pathname}"`);
          if (!/^\/(?!.*\/\/)(?!.*\.\.)([a-zA-Z0-9\-_.:*/]*)$/.test(pathname) || /([^/]:)|([^/]\*)|(\*[^/])/.test(pathname))
            throw new TypeError(`Invalid pathname for GET "${pathname}"`);
          return matchRoute(this.#subdomains[subdomain]?.[arg1] || [], pathname, { exact: false });
        }
        return this.#subdomains[subdomain]?.[arg1] || [];
      },
      set: (arg1, arg2, arg3, arg4 = undefined) => {
        if (arg1 === "subdomains") throw new TypeError("Cannot set subdomains directly.");
        let [subdomain, pathname, handler] = parseArguments(arg1, arg2, arg3, arg4);
        if (arg1 === "redirect") {
          const typeOfTarget = typeof handler;
          if (typeOfTarget !== "object" && typeOfTarget !== "string") throw new TypeError("Invalid argument type");
          if (pathname === "") pathname = "/";
          else if (pathname.endsWith("/*")) this.#emit("warning", "Redirect pathname does not need wildcard");
          const options = /** @type {RedirectOptions} */ (typeOfTarget === "object" ? handler : { target: handler });
          return this.#register("middleware", subdomain, pathname, (req, res) => {
            if (!options.preservePathname) req.url = removeFromPathname(req.url, pathname + "*");
            res.redirect(new URL(req.url || "/", options.target).toString(), true);
          });
        }
        if (arg1 === "proxy") {
          const typeOfTargetOrOptions = typeof handler;
          if (typeOfTargetOrOptions !== "object" && typeOfTargetOrOptions !== "string")
            throw new TypeError("Invalid argument type");
          if (pathname === "") pathname = "/";
          else if (pathname.endsWith("/*")) this.#emit("warning", "Proxy pathname does not need wildcard");
          const options =
            typeOfTargetOrOptions === "string"
              ? { ...DEFAULT_PROXY_OPTIONS, target: handler, xfwd: false }
              : { ...DEFAULT_PROXY_OPTIONS, ...handler, xfwd: false };
          const collection = new Route(subdomain, pathname, "collection");
          options.pathname = pathname;
          collection.add(
            this.#register("middleware", subdomain, pathname, (req, res) => {
              req.__options = options;
              if (!options.preservePathname) req.url = removeFromPathname(req.url, pathname + "*");
              this.#proxy.web(req, res, options, (error) => {
                this.#emit("error", error?.stack || error?.message || error);
                if (!res.writableEnded) this.#send(req, res, 502, "Bad Gateway");
              });
            }),
          );
          collection.add(
            this.#register("websocket", subdomain, pathname, (req, socket, head) => {
              if (!options.preservePathname) req.url = removeFromPathname(req.url, pathname + "*");
              this.#proxy.ws(req, socket, head, options, (err) => err && socket.end());
            }),
          );
          return collection;
        }
        return this.#register(arg1, subdomain, pathname, handler);
      },
      use: async (arg1, arg2, arg3 = undefined) => {
        let [subdomain, basepath, target] = parseArguments("use", arg1, arg2, arg3);
        const typeOfTarget = typeof target;
        if (typeOfTarget === "function") return this.#register("middleware", subdomain, basepath, target);
        if (basepath === "") basepath = "/";
        else if (basepath.endsWith("/*")) this.#emit("warning", "Use pathname does not need wildcard");
        const collection = new Route(subdomain, basepath, "collection");
        const use = async (type, pathname, filepath, arg, emit) => {
          try {
            if (!arg && ["api", "controller", "config", "middleware", "layout"].includes(type))
              arg = (await import(filepath)).default;
            if (type === "config") {
              if (typeof arg !== "object") throw new TypeError("Invalid config type");
              const config = this.#register("config", subdomain, ensureEndsWith(pathname, "/"), arg);
              const segments = pathname.split("/");
              const pages = this.#subdomains[subdomain]?.page || [];
              const regex = pathnameToRegex(pathname);
              for (let i = 0, len = pages.length; i < len; i++) {
                if (pages[i].pathname.match(regex)) continue;
                const page = pages[i].page;
                const configs = page.inherited.configs;
                for (let j = 0, jlen = configs.length; j < jlen; j++) {
                  if (checkIfMoreSpecific(segments, configs[j].pathname)) return configs.splice(j, 0, config);
                }
                collection.add(config);
                configs.push(config);
                page.cache.reset();
              }
            } else if (type === "layout") {
              if (typeof arg !== "function") throw new TypeError("Invalid layout type");
              const { code, resources } = await import(filepath, {
                with: {
                  type: "bundler",
                  globalName: "__app_layout_component",
                  exports: "default",
                },
              });
              const resourceKeys = Object.keys(resources);
              for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++)
                this.#resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] = resources[resourceKeys[i2]];
              const layout = this.#register("layout", subdomain, ensureEndsWith(pathname, "/"), {
                pathname,
                component: arg,
                code: code,
              });
              const segments = pathname.split("/");
              const pages = this.#subdomains[subdomain]?.page || [];
              const regex = pathnameToRegex(pathname);
              for (let i = 0, len = pages.length; i < len; i++) {
                const page = pages[i].page;
                if (
                  !page.pathname.match(regex) ||
                  (page.inherited.layout && !checkIfMoreSpecific(segments, page.inherited.layout.pathname))
                )
                  continue;
                page.inherited.layout = layout;
                page.cache.reset();
              }
              collection.add(layout);
            } else if (type === "page" || type === "error") {
              const configs = [];
              const segments = pathname.split("/");
              for (let i = 0, len = pathname === "/" ? 1 : segments.length; i < len; i++) {
                const config = matchRoute(
                  this.#subdomains[subdomain]?.config || [],
                  segments.slice(0, i + 1).join("/") || "/",
                );
                if (config) configs.push(config);
              }
              const page = await createPage(
                type,
                filepath,
                pathname,
                matchRoute(this.#subdomains[subdomain]?.layout || [], pathname, {
                  exact: false,
                  filter: (route) => route.layout,
                }),
                configs,
              );
              const resourceKeys = Object.keys(page.resources);
              for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++)
                this.#resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] = page.resources[resourceKeys[i2]];
              if (type === "error") {
                collection.add(this.#register("page", subdomain, ensureEndsWith(pathname, "/❌"), page));
                collection.add(
                  this.#register(
                    "error",
                    subdomain,
                    pathname,
                    (req, res, code, message) => {
                      if (req.resource === "page")
                        page
                          .js(req, { code, message })
                          .then((js) => res.send(js, "text/javascript"))
                          .catch((e) => {
                            this.#emit("error", e?.stack || e?.message || e);
                            this.#send(req, res, 500, "Internal Server Error");
                          });
                      else if (req.resource === "manifest") res.reject("Resource not found", 404);
                      else
                        page
                          .html(req, { code, message })
                          .then((html) => res.send(html, "text/html"))
                          .catch((e) => {
                            this.#emit("error", e?.stack || e?.message || e);
                            this.#send(req, res, 500, "Internal Server Error");
                          });
                    },
                    true,
                  ),
                );
              } else {
                collection.add(this.#register("page", subdomain, ensureEndsWith(pathname, "/"), page));
                if (page.config) use("config", pathname, filepath, page.config, false);
                collection.add(
                  this.#register(
                    "get",
                    subdomain,
                    pathname,
                    (req, res) => {
                      if (req.resource === "page")
                        page
                          .js(req, res.props)
                          .then((js) => res.send(js, "text/javascript"))
                          .catch((e) => {
                            this.#emit("error", e?.stack || e?.message || e);
                            res.reject("Internal Server Error", 500);
                          });
                      else if (req.resource === "worker") {
                        if (page.pwa) res.send(worker, "text/javascript");
                        else res.reject("Resource not found", 404);
                      } else if (req.resource === "manifest") {
                        if (page.pwa)
                          page
                            .manifest(req, req.props)
                            .then((manifest) => res.send(manifest, "text/json"))
                            .catch((e) => {
                              this.#emit("error", e?.stack || e?.message || e);
                              res.reject("Internal Server Error", 500);
                            });
                        else res.reject("Resource not found", 404);
                      } else
                        page
                          .html(req, res.props)
                          .then((html) => res.send(html, "text/html"))
                          .catch((e) => {
                            this.#emit("error", e?.stack || e?.message || e);
                            res.reject("Internal Server Error", 500);
                          });
                    },
                    true,
                  ),
                );
              }
            } else if (type === "api" || type === "controller") {
              shareToLoader(fs.resolve(filepath), {
                subdomain,
                pathname: "/api" + pathname,
              });
              collection.add(this.#register(type, subdomain, "/api" + pathname, arg));
            } else collection.add(this.#register(type, subdomain, pathname, arg));
            if (emit != false) this.#emit("ready", { type, subdomain, pathname });
          } catch (e) {
            this.#emit("error", e?.stack || e?.message || e);
          }
        };

        if (typeOfTarget === "object") return (await use("config", basepath, null, target), collection);
        else if (typeOfTarget !== "string") throw new TypeError("Invalid argument type");
        if (!fs.isDirectory(target)) {
          const DefaultClass = (await import(target))?.default;
          if (Object.isPrototypeOf.call(Controller, DefaultClass)) await use("controller", basepath, target);
          else if (Object.isPrototypeOf.call(Component, DefaultClass)) await use("page", basepath, target);
          else throw new TypeError("Invalid file default export type");
          return collection;
        }
        const serverEntries = [];
        const clientEntries = [];
        await findRoutes(
          target,
          basepath,
          {
            api: serverEntries,
            controller: serverEntries,
            middleware: serverEntries,
            page: clientEntries,
            error: clientEntries,
            config: clientEntries,
            layout: clientEntries,
          },
          this.#resources,
        );
        for (let i = 0, len = serverEntries.length; i < len; i++) await use(...serverEntries[i]);
        for (let i = 0, len = clientEntries.length; i < len; i++) await use(...clientEntries[i]);
        return collection;
      },
    };
  }

  /**
   * Direct access to the resource registry. Resources are always served under `/${RESOURCES_PATH}/`.
   * @type {{ get: (name?: string) => string[] | string | Buffer | null, set: (name: string, content: string | Buffer) => null }}
   */
  get resources() {
    return {
      get: (name) => {
        if (name === undefined) return Object.keys(this.#resources);
        return this.#resources[`/${RESOURCES_PATH}/${name}`] ?? null;
      },
      set: (name, content) => {
        if (typeof name !== "string" || !name) throw new TypeError(`Invalid resource name for "${name}"`);
        if (typeof content !== "string" && !Buffer.isBuffer(content)) throw new TypeError("Invalid resource content type");
        this.#resources[`/${RESOURCES_PATH}/${name}`] = content;
        return null;
      },
    };
  }

  /**
   * @typedef {Object} Options
   * @property {number | boolean} [http] - Use http or http port
   * @property {number | boolean} [https] - Use https or https port
   * @property {string} [cert] - Certificate filepath
   * @property {string} [key] - Private key filepath
   * @property {boolean} [start] - Start server, default is true
   * @property {boolean} [strict] - Strict routing, default is true
   * @property {number} [timeout] - Timeout for requests, default is 5 minutes
   * @property {string | { http?: string, https?: string }} [host] - Bind address for both servers, or per protocol. Default is all interfaces
   * @property {{ origins?: string[], native?: boolean }} [cors] - Additional allowed origins; standard Tauri shell origins are enabled unless native is false
   *
   * @param {Options} [options] - Server options or callback
   */
  constructor({ http: httpPort, https: httpsPort, cert, key, start, strict, timeout = TIMEOUT_TIME, host, cors } = {}) {
    if (cors?.native === false) this.#origins.clear();
    if (cors?.origins != null && !Array.isArray(cors.origins)) throw new TypeError("cors.origins must be an array");
    for (const origin of cors?.origins || []) {
      if (
        typeof origin !== "string" ||
        (origin !== "tauri://localhost" && (!/^https?:\/\//.test(origin) || new URL(origin).origin !== origin))
      )
        throw new TypeError("cors.origins must contain exact HTTP(S) origins or tauri://localhost");
      this.#origins.add(origin);
    }
    this.#socket = new SocketIO({
      pingInterval: 60_000,
      cors: (request, callback) =>
        callback(null, {
          origin: this.#allowedOrigin(request) ? request.headers.origin || false : false,
          credentials: true,
        }),
      allowRequest: (request, callback) => callback(null, this.#allowedOrigin(request)),
    });
    if (httpPort === true) httpPort = process.env.NODE_ENV === "development" ? 3000 : 80;
    if (httpsPort === true) httpsPort = 443;
    if (!(httpPort || httpsPort)) throw new Error("Missing ports for either HTTP or HTTPS");
    if (httpsPort && !(cert || key)) {
      httpsPort = null;
      if (!httpPort) throw new Error("Missing certification for HTTPS");
      else
        this.#https = {
          warning: "Disabled HTTPS due to missing certification",
        };
    }
    this.#strict = strict !== false;
    this.#timeout = timeout;
    if (httpPort)
      this.#http = {
        name: "http",
        server: createServer((request, response) =>
          this.#handler(
            {
              protocol: "http",
              port: httpPort,
            },
            request,
            response,
          ),
        ),
        port: httpPort,
        host: typeof host === "string" ? host : host?.http,
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
            (request, response) =>
              this.#handler(
                {
                  protocol: "https",
                  port: httpsPort,
                },
                request,
                response,
              ),
          ),
          port: httpsPort,
          host: typeof host === "string" ? host : host?.https,
          certs: { cert, key },
        };
    }
    this.#socket.use(this.#socketHandler.bind(this, "middleware"));
    this.#socket.on("connection", this.#socketHandler.bind(this, "connection"));
    this.#proxy.on("proxyReq", xForwardHeaders);
    this.#proxy.on("proxyReqWs", xForwardHeaders);
    this.#proxy.on("proxyRes", (proxyRes, req) => {
      const location = proxyRes?.headers?.location;
      const { target, pathname, preservePathname } = req.__options;
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && location?.startsWith(target)) {
        proxyRes.headers.location = ((!preservePathname ? pathname : "") + location.replace(target, "")).replace("//", "/");
      }
    });
    this.#proxy.on("error", (error, req, res) => {
      this.#emit("error", error?.stack || error?.message || error);
      if (res && !res.writableEnded) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway");
      }
    });
    if (start !== false) this.start();
  }

  /**
   * Starts the server using the specified protocol (http or https). If no protocol is specified, both http and https are started.
   *
   * @param {string} [target] The protocol to use for the server (http or https)
   * @returns {Promise<void>} The port number that the server is listening on, or null if an error occurred
   */
  async start(target) {
    let protocol;
    if (target === "http") protocol = this.#http;
    else if (target === "https") protocol = this.#https;
    else {
      await this.start("http");
      await this.start("https");
      return;
    }
    if (protocol?.warning) this.#emit("warning", protocol.warning);
    if (!protocol?.server) return null;
    if (protocol.active) throw new Error(protocol.name.toUpperCase() + " Server already running");
    const { server, port, host } = protocol;
    await async((resolve) => server.listen({ port, host }, () => resolve()));
    // A stopped protocol can be started again; attach the handlers only once.
    if (!protocol.attached) {
      this.#socket.attach(server);
      server.on("upgrade", this.#socketHandler.bind(this, "upgrade"));
      protocol.sockets = new Set();
      server.on("connection", (socket) => {
        protocol.sockets.add(socket);
        socket.once("close", () => protocol.sockets.delete(socket));
      });
      protocol.attached = true;
    }
    shareToLoader("host", { protocol: protocol.name, port });
    protocol.active = true;
    this.#emit("ready", { type: protocol.name, port });
  }

  /**
   * Stops the server using the specified protocol (http or https). If no protocol is specified, both http and https are stopped.
   *
   * @param {string} [target] The protocol to use for stopping the server (http or https)
   * @param {{ force?: boolean }} [options] `force` destroys open connections instead of waiting for them to end
   * @returns {Promise<void>} True if the server was successfully stopped, false otherwise
   */
  async stop(target, options = {}) {
    let protocol;
    if (target === "http") protocol = this.#http;
    else if (target === "https") protocol = this.#https;
    else {
      await this.stop("http", options);
      await this.stop("https", options);
      return;
    }
    if (!protocol?.server || !protocol.active) return;
    const closed = async((resolve) => protocol.server.close(resolve));
    if (options.force) for (const socket of protocol.sockets ?? []) socket.destroy();
    await closed;
    protocol.active = false;
  }

  /**
   * Listens for an event on all connected sockets in a subdomain or globally.
   *
   * @param {string} arg1 The subdomain or event. If subdomain not specified, the listener will be attached to all sockets.
   * @param {string | Function} arg2 The name of the event to listen for or callback function.
   * @param {Function} [arg3] A function to call when the event is triggered.
   */
  on(arg1, arg2, arg3) {
    const [subdomain, event, callback] = typeof arg2 === "function" ? ["*", arg1, arg2] : [arg1, arg2, arg3];
    if (typeof event !== "string") this.#emit("warning", "Invalid event name");
    if (!this.#events[event]) this.#events[event] = [];
    this.#events[event].push((socket, _subdomain, args) => {
      if (_subdomain !== subdomain && subdomain !== "*") return;
      callback.call(
        socket && {
          emit: this.emit.bind(this, subdomain),
          on: this.on.bind(this, subdomain),
          get: (type) => {
            type = type.split(".");
            let current = socket;
            for (let i = 0, len = type.length; i < len; i++) {
              if (current[type[i]] === undefined) return undefined;
              current = current[type[i]];
            }
            return current;
          },
        },
        ...(args || []),
      );
    });
  }

  /**
   * Emits an event to a connected socket, a registered subdomain, or globally.
   *
   * @param {string} target A socket ID, subdomain, or "*" for all sockets.
   * @param {string} event The name of the event to emit.
   * @param {...any} args Additional arguments to pass to the event listener.
   */
  emit(target, event, ...args) {
    if (typeof event !== "string") {
      args = event === undefined ? args : [event, ...args];
      event = target;
      target = "*";
    }
    if (typeof event !== "string" || !event) return this.#emit("warning", "Cannot emit an empty event");
    const socket = this.#socket.sockets.sockets.get(target);
    if (socket?.connected) socket.emit(event, ...args);
    else if (target === "*" || target === "") this.#socket.emit(event, ...args);
    else if (Object.hasOwn(this.#subdomains, target)) this.#socket.to(target).emit(event, ...args);
    else return false;
    return true;
  }

  /**
   * Emit for internal events only
   */
  #emit(event, ...args) {
    const listeners = this.#events[event] || [];
    for (let i = 0, len = listeners.length; i < len; i++) listeners[i](undefined, "*", args);
  }

  #register(type, subdomain, pathname, arg, page) {
    if (type === "api") {
      if (Object.isPrototypeOf.call(Controller, arg)) return this.#register("controller", subdomain, pathname, arg);
      else if (typeof arg === "function") return this.#register("all", subdomain, pathname, arg);
      else throw new TypeError("Invalid api type");
    }
    if (type === "controller") {
      if (!Object.isPrototypeOf.call(Controller, arg)) throw new TypeError("Invalid controller type");
      const socket = {
        emit: this.emit.bind(this, subdomain),
        on: this.on.bind(this, subdomain),
        send: this.emit.bind(this),
      };
      new arg({ socket });
      traverse(arg, (handler) => {
        if (!(handler instanceof RESTMethod)) return;
        this.#register(handler.type, subdomain, addToPathname(pathname, handler.url), async (request, response) => {
          try {
            const body = await request.body();
            const value = await handler(
              Object.assign(typeof body === "object" && !Buffer.isBuffer(body) ? body : { data: body }, request.params, {
                request,
                response,
                socket,
              }),
            );
            if (!response.writableEnded && !response.rejected) response.send(value);
          } catch (e) {
            this.#emit("error", e?.stack || e?.message || e);
            response.reject("Internal Server Error", 500);
          }
        });
      });
      return null;
    }
    if (type === "all") {
      const route = new Route(subdomain, pathname, type, arg);
      for (let i = 0, len = ALL_METHODS.length; i < len; i++) this.#register(ALL_METHODS[i], subdomain, pathname, route);
      return route;
    }
    if (!this.#subdomains[subdomain]) this.#subdomains[subdomain] = {};
    if (!this.#subdomains[subdomain][type]) this.#subdomains[subdomain][type] = [];
    const route = arg instanceof Route ? arg : new Route(subdomain, pathname, type, arg, page);
    const routes = this.#subdomains[subdomain][type];
    for (let i = 0, len = routes.length; i < len; i++) {
      if (routes[i].route === route.route) {
        if (this.#strict)
          throw new Error(
            `${type.toUpperCase()} ${subdomain !== "" ? 'for subdomain "' + subdomain + '"' : ""} path "${pathname}" already exists.`,
          );
        return (routes[i] = route);
      }
    }
    const segments = pathname.split("/");
    for (let i = 0, len = routes.length; i < len; i++) {
      if (checkIfMoreSpecific(segments, routes[i].pathname)) return (routes.splice(i, 0, route), route);
    }
    return (routes.push(route), route);
  }

  #allowedOrigin(request) {
    const origin = request.headers.origin;
    if (!origin) return true;
    try {
      const protocol = request.protocol || (request.socket?.encrypted ? "https" : "http");
      return (
        origin === new URL(`${protocol}://${request.headers.host || request.headers[":authority"]}`).origin ||
        this.#origins.has(origin)
      );
    } catch {
      return false;
    }
  }

  #handler(config, request, response) {
    try {
      request.timeout = setTimeout(() => this.#send(request, response, 408, "Request timeout"), this.#timeout);
      const end = response.end.bind(response);
      response.end = (...args) => (
        end(...args),
        clearTimeout(request.timeout),
        this.#emit("request", {
          protocol: request.protocol,
          subdomain: request.subdomain,
          method: request.method,
          url: request.url,
          status: response.statusCode,
        })
      );
      if (config.protocol === "https" && request.headers[":authority"]) request.headers.host = request.headers[":authority"];
      if (!request.headers) return this.#reject(request, response, "Missing headers", 500);
      if (!request.headers.host) return this.#reject(request, response, "Missing host header", 500);
      request.protocol = config.protocol;
      request.port = config.port;
      if (!this.#allowedOrigin(request)) return this.#send(request, response, 403, "Origin not allowed");
      request.corsOrigin = request.headers.origin;
      request.address = request.socket.remoteAddress;
      request.subdomain = getSubdomain(request.headers.host);
      request.resource = fs.extname(request.url) !== "";
      const url = new URL(request.url, `${request.protocol}://${request.headers.host}`);
      request.href = url.href;
      request.pathname = url.pathname;
      request.params = Object.fromEntries(url.searchParams.entries());
      request.body = () => getRequestBody(request);
      request.cookies = {};
      if (request?.headers?.cookie) {
        const cookies = request?.headers?.cookie?.split(";") || [];
        for (let i = 0, len = cookies.length; i < len; i++) {
          const parts = cookies[i].split("=");
          const name = parts.shift().trim();
          request.cookies[name] = decodeCookieValue(parts.join("=").trim());
        }
      }
      response.cookies = [];
      response.props = {};
      response.headers = {};
      response.set = (type, ...args) => {
        switch (type) {
          case "cookie":
            setCookies(response, {
              [args[0]]: {
                value: args[1] ?? "",
                options: args[2] || {},
              },
            });
            break;
          case "cookies":
            setCookies(response, args[0] || {});
            break;
          case "header":
            response.headers[args[0]] = args[1];
            break;
          case "headers":
            Object.assign(response.headers, args[0] || {});
            break;
          case "props":
            Object.assign(response.props, args[0] || {});
            break;
          default:
            request[type] = args[0];
            break;
        }
      };
      response.reject = (message, code) => {
        response.rejected = true;
        return this.#reject(request, response, message, code);
      };
      response.redirect = (url, permanent) => {
        if (response.writableEnded || response.headersSent) return;
        response.statusCode = 301;
        response.writeHead(permanent ? 301 : 302, {
          "Set-Cookie": response.cookies,
          Location: url,
        });
        response.end();
      };
      response.send = (content, type) =>
        typeof content === "object" && !Buffer.isBuffer(content)
          ? this.#send(request, response, 200, stringify(content), type || "application/json")
          : this.#send(request, response, 200, content, type);
      response.sendFile = (filepath, type, options) => this.#sendFile(request, response, filepath, type, options);
      const middleware = matchRoute(this.#subdomains[request.subdomain]?.middleware, request.pathname, { exact: false });
      if (middleware) middleware.handler(request, response, () => this.#resolve(request, response));
      else this.#resolve(request, response);
    } catch (e) {
      this.#emit("error", e?.stack || e?.message || e);
      this.#reject(request, response, "Internal Server Error", 500);
    }
  }

  #resolve(request, response) {
    try {
      const method = request.method.toLowerCase();
      // Handle CORS preflight requests
      if (method === "options" && request.headers.origin) {
        const origin = request.corsOrigin;
        response.writeHead(204, {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, COPY, MOVE",
          "Access-Control-Allow-Headers": request.headers["access-control-request-headers"] || "*",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        });
        return response.end();
      }
      const resource = this.#resources?.[request.pathname];
      if (request.resource && resource) {
        if (method !== "get") return this.#reject(request, response, "Method not allowed", 405);
        const type = mime.getType(request.pathname) || "application/octet-stream";
        if (fs.isAbsolute(resource) && fs.existsSync(resource)) return response.sendFile(resource, type);
        return response.send(resource, type);
      } else {
        if (request.pathname.endsWith("/page.js"))
          ((request.resource = "page"), (request.pathname = removeFromPathname(request.pathname, "*/page.js")));
        else if (request.pathname.endsWith("/manifest.json"))
          ((request.resource = "manifest"), (request.pathname = removeFromPathname(request.pathname, "*/manifest.json")));
        else if (request.pathname.endsWith("/worker.js"))
          ((request.resource = "worker"), (request.pathname = removeFromPathname(request.pathname, "*/worker.js")));
        const route = matchRoute(this.#subdomains[request.subdomain]?.[method], request.pathname);
        if (route) {
          route.params.forEach((param, index) => (request.params[param] = route.match[index + 1]));
          return route.handler(request, response);
        }
      }
      this.#reject(request, response);
    } catch (e) {
      this.#emit("error", e?.stack || e?.message || e);
      this.#reject(request, response, "Internal Server Error", 500);
    }
  }

  #reject(request, response, message, code) {
    response.message = message || `The requested ${request.resource ? "Resource" : "URL"} "${request.url}" was not found`;
    response.statusCode = code || 404;
    response.send = (content, type) =>
      typeof content === "object"
        ? this.#send(request, response, response.statusCode, stringify(content), type || "application/json")
        : this.#send(request, response, response.statusCode, content, type);
    try {
      const acceptsHtml = request.headers.accept && request.headers.accept.includes("text/html");
      let route = matchRoute(this.#subdomains[request.subdomain]?.error, request.pathname, {
        exact: false,
        filter: (route) => route.active && (acceptsHtml || !route.isPage),
      });
      if (route) return route.handler(request, response, response?.statusCode, response?.message);
      if (request.subdomain === "") return this.#send(request, response, response?.statusCode, response?.message);
      route = matchRoute(this.#subdomains[""]?.error, request.pathname, {
        exact: false,
        filter: (route) => route.active && (acceptsHtml || !route.isPage),
      });
      if (route) return route.handler(request, response, response?.statusCode, response?.message);
      this.#send(request, response, response?.statusCode, response?.message);
    } catch (e) {
      this.#emit("error", e?.stack || e?.message || e);
      this.#send(request, response, 500, "Internal Server Error");
    }
  }

  async #socketHandler(type, ...args) {
    switch (type) {
      case "connection": {
        const socket = args[0];
        const subdomain = getSubdomain(socket?.handshake?.headers?.host) || "";
        socket.onAny((event, ...args) => {
          const listeners = this.#events[event] || [];
          for (let i = 0, len = listeners.length; i < len; i++) listeners[i](socket, subdomain, args);
        });
        socket.on("disconnect", () => {
          const listeners = this.#events["disconnect"] || [];
          for (let i = 0, len = listeners.length; i < len; i++) listeners[i](socket, subdomain, []);
        });
        await socket.join(subdomain);
        const connectListeners = this.#events["connect"] || [];
        for (let i = 0, len = connectListeners.length; i < len; i++) connectListeners[i](socket, subdomain, []);
        return;
      }
      case "upgrade": {
        const [request, socket, head] = args;
        if (!this.#allowedOrigin(request)) return socket.destroy();
        if (request.url.startsWith("/socket.io/")) return;
        request.subdomain = getSubdomain(request.headers.host);
        const url = new URL(request.url, request.headers.origin || `ws://${request.headers.host}`);
        request.href = url.href;
        request.pathname = url.pathname;
        const route = matchRoute(this.#subdomains[request.subdomain]?.websocket, request.pathname, { exact: false });
        if (typeof route?.handler !== "function") return socket.end();
        return route.handler(request, socket, head);
      }
      case "middleware": {
        const [socket, next] = args;
        const request = socket.handshake;
        if (socket.handshake.auth?.token && !request.headers.authorization)
          request.headers.authorization = `Bearer ${socket.handshake.auth.token}`;
        request.subdomain = getSubdomain(request.headers.host);
        const url = new URL(request.url, request.headers.origin || `ws://${request.headers.host}`);
        request.href = url.href;
        request.pathname = url.pathname;
        request.method = "WEBSOCKET";
        const middleware = matchRoute(this.#subdomains[request.subdomain]?.middleware, request.pathname, { exact: false });
        request.params = Object.fromEntries(url.searchParams.entries());
        request.body = () => getRequestBody(request);
        request.cookies = {};
        if (request?.headers?.cookie) {
          const cookies = request?.headers?.cookie.split(";");
          for (let i = 0, len = cookies?.length; i < len; i++) {
            const parts = cookies[i].split("=");
            const name = parts.shift().trim();
            request.cookies[name] = decodeCookieValue(parts.join("=").trim());
          }
        }
        socket.cookies = [];
        socket.props = {};
        socket.set = (type, arg) => (socket[type] = arg);
        socket.reject = (message) => next(new Error(message));
        socket.redirect = () => this.#emit("warning", "redirect is not supported in WebSocket");
        socket.send = () => this.#emit("warning", "send is not supported in WebSocket");
        socket.sendFile = () => this.#emit("warning", "sendFile is not supported in WebSocket");
        return middleware ? middleware.handler(request, socket, next) : next();
      }
      default:
        return;
    }
  }

  #sendFile(request, response, filepath, type, options = {}) {
    if (response.writableEnded || response.headersSent) return;
    const info = fs.statSync(filepath);
    const ranged = options.start != null || options.end != null;
    const start = options.start ?? 0;
    const end = options.end ?? info.size - 1;
    const stream = ranged ? fs.createReadStream(filepath, { start, end }) : fs.createReadStream(filepath);
    const headers = Object.assign(defaultHeaders(request, response, type), options.headers || {});
    headers["Content-Length"] = ranged ? Math.max(0, end - start + 1) : info.size;
    response.statusCode = options.statusCode || 200;
    response.writeHead(response.statusCode, headers);
    stream.pipe(response);
    stream.on("error", (error) => {
      if (response.headersSent) return response.destroy(error);
      response.statusCode = 500;
      response.writeHead(response.statusCode, headers);
      response.end("500 Internal Server Error");
    });
  }

  #send(request, response, code, content, type = "text/plain") {
    if (response.writableEnded || response.headersSent) return;
    response.statusCode = code || 200;
    const acceptEncoding = request.headers["accept-encoding"];
    const headers = defaultHeaders(request, response, type);
    if (!request.headers["x-no-compression"] && acceptEncoding && compressible(type)) {
      if (acceptEncoding.includes("gzip"))
        zlib.gzip(content, (err, buffer) => {
          if (response.writableEnded || response.headersSent) return;
          if (!err) {
            headers["Content-Encoding"] = "gzip";
            response.writeHead(response.statusCode, headers);
            response.end(buffer);
          } else (response.writeHead(response.statusCode, headers), response.end(content));
        });
      else if (acceptEncoding.includes("deflate"))
        zlib.deflate(content, (err, buffer) => {
          if (response.writableEnded || response.headersSent) return;
          if (!err) {
            headers["Content-Encoding"] = "deflate";
            response.writeHead(response.statusCode, headers);
            response.end(buffer);
          } else (response.writeHead(response.statusCode, headers), response.end(content));
        });
      else (response.writeHead(response.statusCode, headers), response.end(content));
    } else (response.writeHead(response.statusCode, headers), response.end(content));
  }
}

export default Server;

//

function pathnameToRegex(pathname) {
  return new RegExp(
    "^" +
      pathname
        .replace(/\/:(\w+)$/, "(?:/:$1)?")
        .replace(/:(\w+)/g, "([^/]+)")
        .replace(/\*$/, ".*"),
  );
}

function parseArguments(method, subdomain, pathname, arg) {
  if (typeof subdomain !== "string") throw new TypeError(`Invalid arguments for ${method.toUpperCase()} "${pathname}"`);
  if (!arg) ((arg = pathname), (pathname = subdomain), (subdomain = ""));
  if (!arg) throw new TypeError(`Invalid arguments for ${method.toUpperCase()} "${pathname}"`);
  if (subdomain !== "" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain))
    throw new TypeError(`Invalid subdomain for "${subdomain}"`);
  if (!pathname) throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  if (pathname.length > 1 && pathname.charAt(pathname.length - 1) === "/")
    throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  if (!/^\/(?!.*\/\/)(?!.*\.\.)([a-zA-Z0-9\-_.:*/]*)$/.test(pathname) || /([^/]:)|([^/]\*)|(\*[^/])/.test(pathname))
    throw new TypeError(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
  return [subdomain, pathname, arg];
}

function getSubdomain(input) {
  if (!input || typeof input !== "string") return "";
  if (input.startsWith("http")) input = input.replace(/^https?:\/\//, "");
  if (input.includes(":")) input = input.split(":")[0];
  if (input && isIPAddress(input)) return "";
  const match = input.match(/^(?:www\.)?([^/:?]+)/i);
  const parts = (match && match[1] ? match[1] : input).split(".");
  if (parts[0] === "www") parts.shift();
  const isLocal = parts.includes("localhost");
  if (parts.length > (isLocal ? 1 : 2)) return parts[0];
  return "";
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    if (request.complete || request.readableEnded) return resolve("");
    const contentLengthHeader = request?.headers?.["content-length"];
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
    const transferEncoding = request?.headers?.["transfer-encoding"];
    const hasBody = (Number.isFinite(contentLength) && contentLength > 0) || !!transferEncoding;
    if (!hasBody) return resolve("");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_SIZE) {
      try {
        request.destroy(new Error("BODY_TOO_LARGE"));
      } catch {
        /* ignore */
      }
      return reject(new Error("BODY_TOO_LARGE"));
    }

    const chunks = [];
    let size = 0;
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      request.removeListener("data", onData);
      request.removeListener("end", onEnd);
      request.removeListener("error", onError);
      request.removeListener("aborted", onAborted);
      request.removeListener("close", onClose);
    };

    const fail = (err) => {
      cleanup();
      reject(err);
    };

    const onData = (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) return fail(new Error("BODY_TOO_LARGE"));
      chunks.push(chunk);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fail(new Error("BODY_TIMEOUT")), BODY_IDLE_TIMEOUT_TIME);
      if (typeof request.resume === "function") request.resume();
    };

    const onEnd = () => {
      cleanup();
      let body = Buffer.concat(chunks, size);
      const contentType = request.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
      if (contentType !== "application/octet-stream") {
        try {
          body = body.toString() ? JSON.parse(body.toString()) : body;
        } catch {
          /* Return as raw if not JSON. */
        }
      }
      resolve(body);
    };

    const onError = (err) => fail(err);
    const onAborted = () => fail(new Error("REQUEST_ABORTED"));
    const onClose = () => {
      if (request.complete || request.readableEnded) return;
      fail(new Error("REQUEST_CLOSED"));
    };

    timeoutId = setTimeout(() => fail(new Error("BODY_TIMEOUT")), BODY_IDLE_TIMEOUT_TIME);
    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
    request.on("aborted", onAborted);
    request.on("close", onClose);
    if (typeof request.resume === "function") request.resume();
  });
}

function xForwardHeaders(proxyReq, originalReq) {
  proxyReq.setHeader("Host", originalReq.headers["host"]);
  proxyReq.setHeader("X-Forwarded-Host", originalReq.headers["x-forwarded-host"] || originalReq.headers["host"]);
  const xprotocol = originalReq.headers["x-forwarded-proto"];
  proxyReq.setHeader("X-Forwarded-Proto", xprotocol || originalReq.protocol || "");
  proxyReq.setHeader("X-Forwarded-Port", (xprotocol && (xprotocol === "https" ? 443 : 80)) || originalReq.port || "");
}

function defaultHeaders(request, response, type) {
  const origin = request.corsOrigin;
  const headers = Object.assign(
    {
      Connection: "keep-alive",
      "X-DNS-Prefetch-Control": "off",
      "X-Frame-Options": "DENY",
      "X-Powered-By": "",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
      "X-Download-Options": "noopen",
      "X-Content-Type-Options": "nosniff",
      "X-Permitted-Cross-Domain-Policies": "none",
      "Referrer-Policy": "no-referrer",
      "X-XSS-Protection": "1; mode=block",
      "Content-Type": type,
    },
    response.headers || {},
  );
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  headers.Vary = [headers.Vary, "Origin"].filter(Boolean).join(", ");
  if (response.cookies) headers["Set-Cookie"] = response.cookies;
  if (request.resource && request.resource !== "page") headers["Cache-Control"] = "public, max-age=14400, immutable";
  else headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate";
  if (process.env.NODE_ENV !== "production") {
    headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
  }
  return headers;
}

function decodeCookieValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function setCookies(response, cookies) {
  const cookieNames = Object.keys(cookies);
  for (let i = 0, len = cookieNames.length; i < len; i++) {
    const cookie = cookies[cookieNames[i]];
    if (cookie.value == null) continue;
    if (!/^[!#$%&'*+.^_`|~\w-]+$/.test(cookieNames[i])) throw new TypeError("Invalid cookie name");
    let value = `${cookieNames[i]}=${encodeURIComponent(String(cookie.value))}; SameSite=${cookie?.options?.sameSite || "Lax"}; Path=${cookie?.options?.path || "/"}; `;
    if (cookie?.options?.expires) value += `; Expires=${cookie.options.expires}`;
    if (cookie?.options?.maxAge) value += `; Max-Age=${cookie.options.maxAge}`;
    if (cookie?.options?.domain) value += `; Domain=${cookie.options.domain}`;
    if (cookie?.options?.secure) value += `; Secure`;
    if (cookie?.options?.httpOnly !== false) value += `; HttpOnly`;
    response.cookies.push(value);
  }
}
