export const INVALID_EVENT_NAME = "Invalid socket event";
export const isBrowser = () => typeof process === "undefined";

export const noCache = (path) => path + `?noCache=${Date.now()}`;

export const system = {
  register(tagname, element) {
    if (typeof process !== "undefined") return new element();
    if (customElements.get(tagname)) return null;
    customElements.define(tagname, element);
    return document.querySelector(tagname);
  },
  get(key) {
    let ref;
    if (typeof process !== "undefined") ref = global;
    else ref = window;
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
    if (typeof process !== "undefined") ref = global;
    else ref = window;
    key = key.split(".");
    while (key.length > 1) {
      const cur = key.shift();
      if (!ref[cur]) ref[cur] = {};
      ref = ref[cur];
    }
    ref[key.shift()] = value;
  },
  addEventListener: (...args) => {
    if (typeof process !== "undefined") return;
    window.addEventListener(...args);
  },
  removeEventListener: (...args) => {
    if (typeof process !== "undefined") return;
    window.removeEventListener(...args);
  },
};

export class FunctionClass extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export * from "./string.js";
export * from "@vistta/utils";
