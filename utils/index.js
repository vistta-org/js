export const INVALID_EVENT_NAME = "Invalid socket event";
export const isBrowser = () => typeof IS_NODE === "undefined";

export const system = {
  register(tagname, element) {
    if (typeof IS_NODE !== "undefined") return new element();
    if (customElements.get(tagname)) return null;
    customElements.define(tagname, element);
    return document.querySelector(tagname);
  },
  get(key) {
    let ref;
    if (typeof IS_NODE !== "undefined") ref = global;
    else if (typeof IS_NODE === "undefined") ref = window;
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
    if (typeof IS_NODE !== "undefined") ref = global;
    else if (typeof IS_NODE === "undefined") ref = window;
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
    if (typeof IS_NODE !== "undefined") return;
    window.addEventListener(...args);
  },
  removeEventListener: (...args) => {
    if (typeof IS_NODE !== "undefined") return;
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
