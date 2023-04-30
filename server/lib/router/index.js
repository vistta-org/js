import { fs } from "../filesystem.js";
import { isValidUrlPathname } from "../../../utils/index.js";
import { Route } from "./route.js";

class Router {
  subdomains = { "": {} };

  register(subdomain) {
    if (this.subdomains[subdomain]) return;
    this.subdomains[subdomain] = {};
  }

  has(subdomain) {
    return this.subdomains[subdomain] != null;
  }

  set(subdomain, method, pathname, filepath, callback) {
    const wildcard = pathname?.match(/\/\[(\w*)\]$/)?.[1];
    if (wildcard) pathname = pathname.replace(`/[${wildcard}]`, "/*");
    if (!isValidUrlPathname(pathname)) return console.warn(`Invalid pathname for ${method.toUpperCase()} "${pathname}"`);
    //
    this.register(subdomain);
    let router = this.subdomains[subdomain];
    if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    if (!pathname.startsWith("/")) pathname = "/" + pathname;
    const path = pathname === "/" ? [method] : (method + pathname).split("/");
    for (let i = 0, len = path.length; i < len; i++) {
      if (router[path[i]] == null) router[path[i]] = {};
      router = router[path[i]];
    }
    if (filepath)
      return (async (routes) => {
        for (let i = 0, len = routes.length; i < len; i++) {
          const curpath = ((pathname.endsWith("/") ? pathname : pathname + "/") + routes[i].pathname).replace(/\/\//g, "/");
          const isErrorPage = isErrorCode(curpath.split("/")?.pop());
          const route = new Route({
            filepath: routes[i].filepath,
            pathname: curpath,
            type: isErrorPage ? "error" : "standard",
            config: getConfig(this.subdomains[subdomain]["get"], curpath),
            callback: callback?.[0],
          });
          this.set(subdomain, isErrorPage ? "error" : "get", curpath, null, await route.import());
        }
      })(getValidRoutesFromFilepath(filepath));
    if (callback instanceof Route) router["@route"] = ((callback.wildcard = wildcard), callback);
    else if (typeof callback === "function") router["@route"] = { pathname, wildcard, handler: callback };
    else if (Array.isArray(callback)) router["@route"] = { pathname, wildcard, handler: transformCallback(callback) };
  }

  get(subdomain, method, pathname, strict) {
    let router = this.subdomains[subdomain];
    if (/\?/.test(pathname)) pathname = pathname.split(/\?(.*)/)[0];
    if (!pathname.startsWith("/")) pathname = "/" + pathname;
    if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    const path = (method + pathname)?.split("/");
    let wildcardMatch;
    for (let i = 0, len = path.length; i < len; i++) {
      if (!router) break;
      if (!strict && router?.["*"]) wildcardMatch = router?.["*"];
      if (typeof strict === "string" && router?.[strict]) wildcardMatch = router?.[strict];
      router = router?.[path[i]];
    }
    return (router || wildcardMatch)?.["@route"];
  }
}

export { Router };

//

function getValidRoutesFromFilepath(basepath) {
  const routes = [];
  const recursive = (path = "") => {
    const fullpath = basepath + path;
    if (fs.isDirectory(fullpath))
      return fs.readdirSync(fullpath).forEach((entry) => {
        if (/^\W/.test(entry) && !/\[\w*\]\.(jsx|tsx)$/.test(entry)) return;
        if (entry === "resources") return console.warn("Resources is a reserved path");
        recursive(path + "/" + entry);
      });
    const extension = fs.extname(path);
    if (extension !== ".jsx" && extension !== ".tsx") return;
    else path = path.slice(0, -4);
    if (path.endsWith("index")) path = path.slice(0, -"index".length);
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
    router = router[path[i]];
    config ??= router?.["@route"]?.config;
  }
  return config;
}

function transformCallback(callback) {
  callback = callback.filter((f) => typeof f === "function");
  if (callback.length === 0) return null;
  const transform = (callbacklist) => {
    const _callback = callbacklist.pop();
    return (request, response) => _callback(request, response, transform(callbacklist));
  };
  return transform(callback);
}

function isErrorCode(pathname) {
  if (pathname.length !== 3) return false;
  const n = +pathname;
  return 400 <= n && n < 600;
}
