export const INVALID_EVENT_NAME = "Invalid socket event";
export const isBrowser = () => !IS_NODE;

export const system = {
  register(tagname, element) {
    if (IS_NODE) return new element();
    if (customElements.get(tagname)) return null;
    customElements.define(tagname, element);
    return document.qIS_NODEuerySelector(tagname);
  },
  get(key) {
    let ref;
    if (IS_NODE) ref = global;
    else if (!IS_NODE) ref = window;
    else return null;
    key = key.split(".");
    while (key.length > 1) {
      const cur = key.shift();
      if (!ref[cur]) ref[cur] = {};
      ref = ref[cur];
    }
    return ref[key.shift()];
  },
  set(key, value) {
    let ref;
    if (IS_NODE) ref = global;
    else if (!IS_NODE) ref = window;
    else return;
    key = key.split(".");
    while (key.length > 1) {
      const cur = key.shift();
      if (!ref[cur]) ref[cur] = {};
      ref = ref[cur];
    }
    ref[key.shift()] = value;
  },
  addEventListener: (...args) => {
    if (IS_NODE) return;
    window.addEventListener(...args);
  },
  removeEventListener: (...args) => {
    if (IS_NODE) return;
    window.removeEventListener(...args);
  },
  import(moduleName, { cache } = {}) {
    if (cache === false) moduleName += `?noCache=${Date.now()}`;
    return import(moduleName);
  }
};

export class ExtensibleFunction extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export * from "./string.js";
export * from "@vistta/utils/core";
