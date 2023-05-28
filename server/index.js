import { fs } from "./filesystem";
import { isIPAddress, randomID } from "@/utils";
import { EventEmitter } from "node:events";
import express from "express";
import http from "http";
import http2 from "http2";
import http2express from "http2-express-bridge";
import { Server as SocketServer } from "socket.io";
import compression, { filter } from "./compression";
import { Router } from "./router";

class Server {
  #id = randomID();
  #ports;
  #certs;
  #app;
  #socket;
  #events = new EventEmitter();
  #router = new Router();

  get ports() {
    return this.#ports;
  }

  get certs() {
    return this.#certs;
  }

  constructor(ports, certs, startOrCallback = true) {
    if (!(ports?.http || ports?.https)) throw "Missing ports for either http or https";
    if (ports?.https && !(certs?.cert || certs?.key)) {
      ports.https = null;
      console.warn("Disabled HTTPS due to missing certification");
    }
    this.#ports = ports;
    this.#certs = certs;
    this.#app = http2express(express);
    this.#app.enable("trust proxy");
    this.#app.use([useSecure(ports), compression({ filter: shouldCompress }), this.#routeHandler()]);
    if (startOrCallback) this.listen(null, typeof startOrCallback === "function" ? startOrCallback : null);
  }

  listen(protocol, callback) {
    if (this.running) throw "Server already running";
    if (protocol) {
      const port = this.#ports[protocol];
      if (!port) return;
      const server =
        protocol === "http"
          ? http.createServer(this.#app)
          : http2.createSecureServer(
              {
                cert: fs.readFileSync(this.#certs.cert),
                key: fs.readFileSync(this.#certs.key),
                allowHTTP1: true,
              },
              this.#app
            );
      server.listen(port, () => {
        this.#socket.attach(server);
        callback && callback({ protocol, port });
      });
      return;
    }
    this.#socket = new SocketServer();
    this.listen("http", callback);
    this.listen("https", callback);
    this.#socket.on("connection", (socket) => {
      const subdomain = getSubdomain(socket.handshake.headers.host) || "";
      socket.join(subdomain);
      socket.onAny((event, callback) => this.#events.emit(subdomain + "/" + event, callback));
    });
    this.running = true;
  }

  copy(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("copy", subdomain, pathname)) return;
    this.#router.set(subdomain, "copy", pathname, callback);
  }

  delete(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("delete", subdomain, pathname)) return;
    this.#router.set(subdomain, "delete", pathname, callback);
  }

  get(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("get", subdomain, pathname)) return;
    this.#router.set(subdomain, "get", pathname, callback);
  }

  move(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("move", subdomain, pathname)) return;
    this.#router.set(subdomain, "move", pathname, callback);
  }

  patch(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("patch", subdomain, pathname)) return;
    this.#router.set(subdomain, "patch", pathname, callback);
  }

  post(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("post", subdomain, pathname)) return;
    this.#router.set(subdomain, "post", pathname, callback);
  }

  put(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("put", subdomain, pathname)) return;
    this.#router.set(subdomain, "put", pathname, callback);
  }

  error(...args) {
    const [subdomain, pathname, ...callback] = getHTTPMethodArgs(args);
    if (!validateHTTPArgs("error", subdomain, pathname)) return;
    this.#router.set(subdomain, "error", pathname, callback);
  }

  async use(folder, ...args) {
    if (args.length == 2) args.unshift("");
    const [subdomain, pathname, options] = args; // callback,
    if (!validateHTTPArgs("use", subdomain, pathname)) return;
    const { callback, ignore, useApiRoute } = options || {};
    const files = Router.readFolder(folder, ignore);
    for (let i = 0, len = files.length; i < len; i++) {
      const { filepath, pathname } = files[i];
      if (useApiRoute === false || !pathname.startsWith("/api")) {
        const method = Router.isErrorRoute(pathname.split("/")?.pop()) ? "error" : "get";
        await this.#router.setComponent(filepath, subdomain, pathname || "/", method, (event) => {
          const { type, event: name, pathname: href } = event;
          if (type === "standard" && name === "changed") this.#socket.to(subdomain).emit("system/refresh", href);
          if (callback) callback(event);
        });
      } else await this.#router.setApi(filepath, subdomain, pathname || "/");
    }
  }

  emit(...args) {
    if (!this.#router.has(args[0])) args.unshift("");
    const [subdomain, event, ...rest] = args;
    this.#socket.to(subdomain).emit(event, ...rest);
  }

  on(...args) {
    if (!this.#router.has(args[0])) args.unshift("");
    /*const [subdomain, event, ...rest] = args;
    const { subdomain, event } = typeof e === "string" ? { event: e } : e;
    // this.#events.on(`/g/${this.#id}/${event}`, callback);*/
  }

  #routeHandler() {
    return (request, response) => {
      const { method, path, hostname } = request;
      const subdomain = getSubdomain(hostname) || "";
      const error = this.#router.get(subdomain, "error", path, "404") || {};
      const reject = (request, response) => (
        response.status(404),
        error?.handler?.call(error, request, response, () => response.end("Page not Found")) ||
          response.end("Page not Found")
      );
      const [pathname, resource] = path.split(/\/resources\/(.*)/);
      const route = this.#router.get(subdomain, method.toLowerCase(), pathname) || {};
      if (route?.handler) {
        request.resource = resource;
        return route?.handler.call(route, request, response, reject.bind(this, request, response));
      }
      return reject(request, response);
    };
  }
}

export default Server;
export * from "./console";
export * from "./crypto";
export * from "./filesystem";
export * from "./process";

//

function validateHTTPArgs(method, subdomain, pathname) {
  if (subdomain !== "" && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain))
    return console.warn(`Invalid subdomain for "${subdomain}"`), false;
  if (!pathname) return console.warn(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`), false;
  if (!pathname.startsWith("/")) return console.warn(`Invalid arguments for ${method.toUpperCase()} "${pathname}"`), false;
  return true;
}

function getHTTPMethodArgs(args) {
  if (typeof args[0] !== "string") return [];
  if (typeof args[1] !== "string" || typeof args[2] !== "function") return [];
  if (typeof args[1] === "function") args.unshift("");
  return args;
}

function getSubdomain(hostname) {
  if (isIPAddress(hostname)) return false;
  let parts = hostname.split(".");
  if (parts[0] === "www") parts.shift();
  const isLocal = parts.includes("localhost");
  if (parts.length > (isLocal ? 1 : 2)) return parts[0];
  return null;
}

function useSecure({ http, https }) {
  return function (request, response, next) {
    if (
      !(process.env.NODE_ENV === "development" || process.env.ENV_TYPE === "development" || request.secure || https == null)
    ) {
      let { host } = request.headers || {};
      if (host.endsWith(":" + http)) host = host.split(":")[0];
      if (`${https}` !== "443") host += ":" + https;
      return response.redirect(`https://${host}${request.url}`);
    }
    next();
  };
}

function shouldCompress(request, response) {
  return !request.headers["x-no-compression"] && filter(request, response);
}
