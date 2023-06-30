import "./console";
import { fs } from "./filesystem";
import { isIPAddress, randomID } from "../utils";
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
  // ports, certs, startOrCallback = true
  constructor({ http, https, cert, key, autoStart, callback }) {
    if (http === true) http = 80;
    if (https === true) https = 443;
    if (!(http || https)) throw "Missing ports for either HTTP or HTTPS";
    if (https && !(cert || key)) {
      https = null;
      if (!http) throw "Missing certification for HTTPS";
      else console.warn("Disabled HTTPS due to missing certification");
    }
    this.#ports = { http, https };
    this.#certs = { cert, key };
    this.#app = http2express(express);
    this.#app.enable("trust proxy");
    this.#app.use([
      useSecure({ http, https }),
      compression({ filter: shouldCompress }),
      express.json(),
      this.#routeHandler(),
    ]);
    if (autoStart || callback) this.listen(null, callback);
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
      socket.onAny((event, ...args) => this.#events.emit(event, subdomain, socket, args));
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
    const [subdomain, pathname, options] = args;
    if (!validateHTTPArgs("use", subdomain, pathname)) return;
    const { callback, ignore, useApiRoute } = options || {};
    const files = Router.readFolder(folder, ignore);
    for (let i = 0, len = files.length; i < len; i++) {
      const { filepath, pathname } = files[i];
      if (useApiRoute === false || !pathname.startsWith("/api")) {
        const method = Router.isErrorRoute(pathname.split("/")?.pop()) ? "error" : "get";
        await this.#router.setComponent(filepath, subdomain, pathname || "/", method, (event) => {
          const { type, event: name, pathname: href } = event;
          if (type === "page" && name === "modified") this.#socket.to(subdomain).emit("@app/refresh", href);
          if (callback) callback(event);
        });
      } else if (pathname === "/api") this.#socketUse(subdomain, await Router.importApi(filepath));
      else await this.#router.setApi(filepath, subdomain, pathname, callback);
    }
  }

  disable(...args) {
    if (args.length < 2) args.unshift("");
    if (!validateHTTPArgs("disable", subdomain, pathname)) return;
    const [subdomain, pathname] = args;
    this.#router.disable(subdomain, pathname);
  }

  enable(...args) {
    if (args.length < 2) args.unshift("");
    if (!validateHTTPArgs("enable", subdomain, pathname)) return;
    const [subdomain, pathname] = args;
    this.#router.enable(subdomain, pathname);
  }

  emit(subdomain, event, ...args) {
    if (typeof event !== "string") {
      console.warn("Cannot emit an empty event");
      return;
    }
    let channel = this.#socket;
    if (subdomain && subdomain !== "*") channel = channel.to(subdomain);
    channel.emit(event, ...args);
  }

  on(subdomain, event, callback) {
    if (typeof event !== "string") {
      console.warn("Cannot listen to an empty event");
      return;
    }
    this.#events.on(transformEventName(event), (_subdomain, socket, args) => {
      if (subdomain && subdomain !== "*" && subdomain !== _subdomain) return;
      callback(...args);
    });
  }

  #socketUse(subdomain, handlers) {
    const events = Object.keys(handlers);
    for (let i = 0, len = events.length; i < len; i++) {
      const event = events[i];
      this.#events.on(transformEventName(event), (_subdomain, socket, args) => {
        if (subdomain !== _subdomain) return;
        handlers[event](
          {
            emit: (_event, ..._args) => socket.emit(transformEventName(_event), ..._args),
            broadcast: (_event, ..._args) => socket.to(subdomain).emit(transformEventName(_event), ..._args),
            announce: (_event, ..._args) => this.#socket.to(subdomain).emit(transformEventName(_event), ..._args),
          },
          ...args
        );
      });
    }
  }

  #routeHandler() {
    return (request, response) => {
      const { method, path, hostname } = request;
      const subdomain = getSubdomain(hostname) || "";
      const error = this.#router.get(subdomain, "error", path, { strict: "404" }) || {};
      const reject = (request, response) => (
        response.status(404),
        error?.handler?.call(error, request, response, () => response.end("Page not Found")) ||
          response.end("Page not Found")
      );
      const [pathname, resource] = path.split(/\/resources\/(.*)/);
      if (resource?.length) request.resource = resource;
      const route = this.#router.get(subdomain, method.toLowerCase(), pathname) || {};
      if (route?.handler) return route?.handler.call(route, request, response, reject.bind(this, request, response));
      return reject(request, response);
    };
  }
}

export default Server;
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

function transformEventName(string) {
  return string
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/-/g, "_");
}
