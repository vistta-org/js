export const INVALID_EVENT_NAME = "Invalid socket event";
export const isBrowser = () => !process.env.IS_NODE;

export const noCache = (path) => path + `?noCache=${Date.now()}`;

export const system = {
  register(tagname, element) {
    if (process.env.IS_NODE) return new element();
    if (customElements.get(tagname)) return null;
    customElements.define(tagname, element);
    return document.querySelector(tagname);
  },
  get(key) {
    let ref;
    if (process.env.IS_NODE) ref = global;
    else if (!process.env.IS_NODE) ref = window;
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
    if (process.env.IS_NODE) ref = global;
    else if (!process.env.IS_NODE) ref = window;
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
    if (process.env.IS_NODE) return;
    window.addEventListener(...args);
  },
  removeEventListener: (...args) => {
    if (process.env.IS_NODE) return;
    window.removeEventListener(...args);
  }
};

class ExtensibleFunction extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export class BaseClass {
  constructor() {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === 'undefined' && typeof descriptor.set === 'undefined')
        this[functions[i]] = this[functions[i]].bind(this);
    }
  }
}

export class BaseFunction extends ExtensibleFunction {
  constructor(f) {
    super(f);
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === 'undefined' && typeof descriptor.set === 'undefined')
        this[functions[i]] = this[functions[i]].bind(this);
    }
  }
}

export * from "./string.js";
export * from "@vistta/utils/core";
