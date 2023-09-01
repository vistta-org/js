import { Route } from "./route";
import { useApi } from "./api";
import { isValidUrlPathname } from "../../utils";
import { fs } from "../filesystem";

class Router {
  subdomains = { "": {} };

  register(subdomain) {
    if (this.subdomains[subdomain]) return;
    this.subdomains[subdomain] = {};
  }

  has(subdomain) {
    return this.subdomains[subdomain] != null;
  }

  set(subdomain, method, pathname, callback) {
    const wildcard = pathname?.match(/\/\[(\w*)\]$/)?.[1];
    if (wildcard) pathname = pathname.replace(`/[${wildcard}]`, "/*");
    if (!isValidUrlPathname(pathname)) return console.warn(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
    //
    this.register(subdomain);
    let router = this.subdomains[subdomain];
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    if (!pathname.startsWith("/")) pathname = "/" + pathname;
    const path = pathname === "/" ? [""] : pathname.split("/");
    for (let i = 1, len = path.length; i < len; i++) {
      if (router[path[i]] == null) router[path[i]] = {};
      router = router[path[i]];
    }
    if (callback instanceof Route) router["@route"] = ((callback.wildcard = wildcard), callback);
    else if (typeof callback === "function") router["@route"] = { pathname, method, wildcard, handler: callback };
    else if (Array.isArray(callback))
      router["@route"] = { pathname, method, wildcard, handler: transformCallback(callback) };
  }

  get(subdomain, _method, pathname, { strict, disabled } = {}) {
    let router = this.subdomains[subdomain];
    if (/\?/.test(pathname)) pathname = pathname.split(/\?(.*)/)[0];
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    if (!pathname.startsWith("/")) pathname = "/" + pathname;
    const path = pathname === "/" ? [""] : pathname.split("/");

    const valid = (curr) => {
      const { method, enabled } = curr?.["@route"] || {};
      return (disabled || enabled !== false) && (method === "any" || method === _method);
    };
    let wildcardMatch = !strict && valid(router?.["*"]) ? router["*"] : undefined;
    for (let i = 1, len = path.length; i < len; i++) {
      if (!router) break;
      if (!strict && valid(router?.["*"])) wildcardMatch = router["*"];
      if (typeof strict === "string" && valid(router?.[strict])) wildcardMatch = router[strict];
      router = router?.[path[i]];
    }
    if (valid(router)) return router?.["@route"];
    return wildcardMatch?.["@route"];
  }

  disable(subdomain, pathname) {
    const route = this.get(subdomain, "any", pathname, { strict: true, disabled: true });
    route.enabled = false;
  }

  enable(subdomain, pathname) {
    const route = this.get(subdomain, "any", pathname, { strict: true, disabled: true });
    route.enabled = true;
  }

  async setComponent(filepath, subdomain, pathname, method, callback) {
    const config = getConfig(this.subdomains[subdomain], pathname);
    const route = new Route(filepath, pathname, method, config, callback);
    this.set(subdomain, method, pathname, await route.import());
  }

  async setApi(filepath, subdomain, pathname, callback) {
    const api = await useApi(filepath, { pathname: pathname || "/", callback });
    if (api) this.set(subdomain, "any", pathname, api);
  }
}

Router.readFolder = getValidRoutesFromFolder;
Router.isErrorRoute = isErrorRoute;
Router.useApi = useApi;

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

function getValidRoutesFromFolder(folder, pattern = new RegExp("^[A-Za-z0-9]")) {
  const routes = [];
  const recursive = (path = "") => {
    const fullpath = folder + path;
    if (fs.isDirectory(fullpath))
      return fs.readdirSync(fullpath).forEach((entry) => {
        if (!pattern.test(entry) && !/\[\w*\]\.(jsx|tsx)$/.test(entry)) return;
        if (entry === "resources") return console.warn("Resources is a reserved path");
        recursive(path + "/" + entry);
      });
    const ext = fs.extname(path);
    if (![".js", ".jsx", ".ts", ".tsx"].includes(fs.extname(path))) return;
    else path = path.slice(0, ext.length * -1);
    if (path.endsWith("index")) path = path.slice(0, ("index".length + 1) * -1);
    routes.push({ filepath: fullpath, pathname: path });
  };
  recursive();
  return routes.sort((a, b) => {
    [a, b] = [a.pathname.split("/"), b.pathname.split("/")];
    if (a.length == b.length) return a[a.length - 1].length > b[b.length - 1].length ? 1 : -1;
    return a.length > b.length ? 1 : -1;
  });
}

function getConfig(router, path) {
  let config = router?.["@route"]?.config;
  if (path.startsWith("/")) path = path.slice(1);
  path = path === "" ? [] : path?.split("/");
  for (let i = 0, len = path.length; i < len; i++) {
    if (!router?.[path[i]]) break;
    router = router[path[i]];
    config ??= router?.["@route"]?.config;
  }
  return config;
}

function isErrorRoute(pathname) {
  if (pathname.length !== 3) return false;
  const n = +pathname;
  return 400 <= n && n < 600;
}
