export const randomID = () => {
  if (typeof crypto !== "undefined") crypto.randomUUID();
  let dt = new Date().getTime();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const isEqual = (arg1, arg2) => {
  if (typeof arg1 !== typeof arg2) return false;
  if (Array.isArray(arg1) && Array.isArray(arg2)) {
    if (arg1.length !== arg2.length) return false;
    for (let i = 0; i < arg1.length; i++) {
      if (!isEqual(arg1[i], arg2[i])) return false;
    }
    return true;
  }
  if (arg1 == null || arg2 == null) return arg1 === arg2;
  if (typeof arg1 === "object" && typeof arg2 === "object") {
    if (arg1.constructor !== arg2.constructor) return false;
    // Custom Constructors Comparation
    if (arg1 instanceof Date) return arg1.getTime() === arg2.getTime();
    // Normal Comparation
    if (Object.keys(arg1).length !== Object.keys(arg2).length) return false;
    for (const key in arg1) {
      if (!isEqual(arg1[key], arg2[key])) return false;
    }
    return true;
  }
  return arg1 === arg2;
};

export const isPromise = (f) => f instanceof Promise;

export const isAsync = (f) => f.constructor.name === "AsyncFunction";

export const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
  import(moduleName, { cache } = {}) {
    if (cache === false) moduleName += `?noCache=${Date.now()}`;
    return import(moduleName);
  },
};

export * from "./date.js";
export * from "./object.js";
export * from "./string.js";
