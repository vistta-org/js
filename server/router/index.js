// import { Route } from "./route";
import { EventEmitter } from "node:events";
import { useHandler } from "./handler";
import { fs } from "@vistta/utils/fs";

const WILDCARD = "/*";
const TYPES = ["middleware", "socket", "api", "template", "app", "page", "error"];

class Router {
  static isWildcard = (pathname) => pathname?.match(/\/\[(\w*)\]$/)?.[1];

  #pwa = false;
  #template;
  #routes = {};
  #handlers = {};
  #errors = {};
  #middlewares = {};
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
    const wildcard = pathname.endsWith("/*") ? "any" : Router.isWildcard(pathname);
    const target = method !== "error" && method !== "middleware" ? "default" : method;
    const route = wildcard ? pathname.replace(`/[${wildcard}]`, target === "default" ? WILDCARD : "") : pathname.endsWith("/") ? pathname : pathname + "/";
    const handlers = method === "error" ? this.#errors : method === "middleware" ? this.#middlewares : this.#handlers;
    if (handlers[route].enabled !== false) return console.warn(`Route for ${method === "error" || method === "middleware" ? method + " on " : ""}"${pathname}" already defined.`);
    handlers[route] = Object.assign(Array.isArray(callback) ? transformCallback(callback) : callback, {
      pathname,
      method,
      wildcard,
    });
    this.#routes[target] = Object.keys(handlers);
    this.#routes[target].sort((a, b) => (a.match(/\//g) || []).length - (b.match(/\//g) || []).length);
  }

  get(method, pathname, filter) {
    pathname = pathname.endsWith("/") ? pathname : pathname + "/";
    const routes = this.#routes[method !== "error" && method !== "middleware" ? "default" : method];
    const handlers = method === "error" ? this.#errors : method === "middleware" ? this.#middlewares : this.#handlers;
    let handler;
    for (let i = 0, len = routes?.length || 0; i < len; i++) {
      let route = routes[i];
      if (
        ((method === "error" || method === "middleware") && !pathname.startsWith(route)) ||
        (method === "tree" && !pathname.startsWith(route.endsWith(WILDCARD) ? route.slice(0, -1) : route)) ||
        (method !== "error" && method !== "middleware" && method !== "tree" && (route.endsWith(WILDCARD) ? !pathname.startsWith(route.slice(0, -1)) : route !== pathname))
      ) continue;
      route = handlers[route];
      if (method === "tree") method = "any";
      if (
        (filter === false || filter ? filter(route) : route?.enabled !== false) &&
        (method === route.method || method === "any" || route.method === "any")
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
    if (type === "template") return (this.#template = (await useHandler(args)));
    if (type === "socket") return (await useHandler(args))((...args) => this.#events.on(...args));
    if (type === "app" || type === "page" || type === "error") {
      if (type === "app") this.#pwa = true;
      args.pwa = type === "app" || this.#pwa;
      args.resources = this.resources;
      args.config = this.get("tree", pathname, (route) => ["app", "page"].includes(route.type))?.config || {}
      args.template = this.#template;
    }
    return this.set(type === "api" ? "any" : (type !== "error" && type !== "middleware") ? "get" : type, pathname, await useHandler(args));
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
    else if (dirname === "/" && ((["socket"].includes(basename) && [".js", ".ts"].includes(extname)) || ("template" === basename && [".js", ".jsx", ".ts", ".tsx"].includes(extname))))
      routes.push({
        filepath,
        pathname: "",
        type: basename,
      });
    else if (
      (["page", "error", "middleware"].includes(basename) || dirname + basename === "/app") &&
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
    const priorityA = TYPES.indexOf(a.type);
    const priorityB = TYPES.indexOf(b.type);
    return (priorityA == priorityB ? a.pathname.split("/").length - b.pathname.split("/").length : priorityA - priorityB);
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
