// import { Route } from "./route";
import { EventEmitter } from "node:events";
import { useHandler } from "./handler";
import { fs } from "../filesystem";

const WILDCARD = "/*";
const ERROR = "/✖";

class Router {
  static isWildcard = (pathname) => pathname?.match(/\/\[(\w*)\]$/)?.[1];

  #pwa = false;
  #store;
  #routes = [];
  #handlers = {};
  #resources = {};
  #events = new EventEmitter();

  resources = {
    get: (key) => {
      if (key) return this.#resources[key];
      return this.#resources;
    },
    add: (key, value) => {
      switch (typeof key) {
        case "object":
          return Object.assign(this.#resources, key);
        case "string":
          return (this.#resources[key] = value);
        default:
          return null;
      }
    },
  };

  set(method, pathname, callback) {
    const { wildcard, route } = (() => {
      let wildcard = Router.isWildcard(pathname);
      if (!wildcard) {
        if (method === "error") return { route: (pathname.endsWith("/") ? pathname.slice(0, -1) : pathname) + ERROR };
        else return { route: pathname.endsWith("/") ? pathname : pathname + "/" };
      }
      return { wildcard, route: pathname.replace(`/[${wildcard}]`, method === "error" ? ERROR : WILDCARD) };
    })();
    if (this.#handlers[route]) return console.warn(`Route for "${pathname}" already defined.`);
    this.#handlers[route] = Object.assign(Array.isArray(callback) ? transformCallback(callback) : callback, {
      pathname,
      method,
      wildcard,
    });
    this.#routes = Object.keys(this.#handlers);
    this.#routes.sort((a, b) => (a.match(/\//g) || []).length - (b.match(/\//g) || []).length);
  }

  get(method, pathname, filter) {
    pathname = pathname.endsWith("/") ? pathname : pathname + "/";
    let handler;
    for (let i = 0, len = this.#routes.length; i < len; i++) {
      let route = this.#routes[i];
      if (
        (() => {
          switch (method) {
            case "error":
              return route.endsWith(ERROR) && !pathname.startsWith(route.slice(0, -1));
            case "tree":
              return !pathname.startsWith(route.endsWith(WILDCARD) ? route.slice(0, -1) : route);
            default:
              return route.endsWith(WILDCARD) ? !pathname.startsWith(route.slice(0, -1)) : route !== pathname;
          }
        })()
      )
        continue;
      route = this.#handlers[route];
      if (method === "tree") method = "any";
      if (
        (filter === false || filter ? filter(route) : route?.enabled !== false) &&
        (method === route.method ||
          (method === "any" && route.method !== "error") ||
          (route.method === "any" && method !== "error"))
      )
        handler = route;
    }
    return handler;
  }

  emit(event, socket, args) {
    this.#events.emit(event, socket, args);
  }

  on(event, callback) {
    this.#events.on(event, callback);
  }

  disable(pathname) {
    this.get("any", pathname, false).enabled = false;
  }

  enable(pathname) {
    this.get("any", pathname, false).enabled = true;
  }

  async setComponent(filepath, pathname, type, callback) {
    const args = { filepath, pathname, type, callback };
    if (type === "store") return (this.#store = (await useHandler(args))());
    if (type === "socket") return (await useHandler(args))((...args) => this.#events.on(...args));
    if (type === "app" || type === "page" || type === "error") {
      if (type === "app") this.#pwa = true;
      args.pwa = type === "app" || this.#pwa;
      args.resources = this.resources;
      args.config = this.get("tree", pathname, (route) => ["app", "page"].includes(route.type))?.config || {};
      args.store = this.#store;
    }
    return this.set(type === "api" ? "any" : type === "error" ? "error" : "get", pathname, await useHandler(args));
  }
}

Router.readFolder = (folder, api) => {
  const routes = [];
  const recursive = (pathname = "") => {
    const filepath = folder + pathname;
    if (fs.isDirectory(filepath))
      return fs.readdirSync(filepath).forEach((entry) => recursive(pathname + "/" + entry)), routes;
    //
    const extname = fs.extname(filepath);
    const dirname = fs.dirname(pathname);
    const basename = fs.basename(filepath, extname);
    if (api && (dirname === "/api" || dirname.startsWith("/api/")) && [".js", ".ts"].includes(extname))
      routes.push({
        filepath,
        pathname: dirname + "/" + basename,
        type: "api",
      });
    else if (dirname === "/" && ["socket", "store"].includes(basename) && [".js", ".ts"].includes(extname))
      routes.push({
        filepath,
        pathname: "",
        type: basename,
      });
    else if (
      (["page", "error"].includes(basename) || dirname + basename === "/app") &&
      [".js", ".jsx", ".ts", ".tsx"].includes(extname)
    )
      routes.push({
        filepath,
        pathname: dirname,
        type: basename,
      });
    return routes;
  };
  return recursive().sort((a, b) => {
    [a, b] = [a.pathname.split("/"), b.pathname.split("/")];
    if (a.length == b.length) return a[a.length - 1].length > b[b.length - 1].length ? 1 : -1;
    return a.length > b.length ? 1 : -1;
  });
};

export { Router };

//

function transformCallback(callback) {
  callback = callback.filter((f) => typeof f === "function");
  if (callback.length === 0) return null;
  const transform = (callbacklist) => {
    const _callback = callbacklist.pop();
    return (request, response) => _callback(request, response, transform(callbacklist));
  };
  return transform(callback);
}
