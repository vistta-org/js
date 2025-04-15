export const INVALID_EVENT_NAME = "Invalid socket event";
export const RESOURCES_PATH = "assets";

export const defineReadonly = (obj, key, value) =>
  Object.defineProperty(obj, key, {
    value,
    writable: false,
    configurable: false,
  });
export const noCache = (path) => path + `?noCache=${Date.now()}`;

export function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}

export class FunctionClass extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export * from "./string.js";
export * from "@vistta/utils";
