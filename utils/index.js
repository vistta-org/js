export const INVALID_EVENT_NAME = "Invalid socket event";

export const randomID = () => {
  if (typeof crypto !== "undefined") crypto.randomUUID();
  let dt = new Date().getTime();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const isServer = () => typeof global !== "undefined";

export const isBrowser = () => typeof window !== "undefined";

export const system = {
  register(tagname, element) {
    if (isServer()) return new element();
    if (customElements.get(tagname)) return null;
    customElements.define(tagname, element);
    return document.querySelector(tagname);
  },
  get(key) {
    let ref;
    if (isServer()) ref = global;
    else if (isBrowser()) ref = window;
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
    if (isServer()) ref = global;
    else if (isBrowser()) ref = window;
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
    if (isServer()) return;
    window.addEventListener(...args);
  },
  removeEventListener: (...args) => {
    if (isServer()) return;
    window.removeEventListener(...args);
  },
  import(moduleName, { cache } = {}) {
    if (cache === false) moduleName += `?noCache=${Date.now()}`;
    return import(moduleName);
  },
};

export class ExtensibleFunction extends Function {
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export * from "./string.js";
export * from "@uttils/kit/core";