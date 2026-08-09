export const defineReadonly = (obj, key, value) =>
  Object.defineProperty(obj, key, {
    value,
    writable: false,
    configurable: false,
  });

export const noCache = (path) => path + `?noCache=${Date.now()}`;

export class FunctionClass extends Function {
  // @ts-ignore
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export * from "@vistta/utils";
export * from "./router.js";
export * from "./string.js";
export * from "./viewport.js";
