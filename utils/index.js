import { isObject } from "./object.js";

export const randomID = () => {
  if (typeof crypto !== "undefined") crypto.randomUUID();
  let dt = new Date().getTime();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const isEqual = (a, b) => {
  if (!isObject(a) || !isObject(b)) return a === b;
  const propsA = Object.getOwnPropertyNames(a);
  const propsB = Object.getOwnPropertyNames(b);
  if (propsA.length != propsB.length) return false;
  for (let i = 0, len = propsA.length; i < len; i++) {
    if (!isEqual(a[propsA[i]], b[propsA[i]])) return false;
  }
  return true;
};

export const isPromise = (f) => f() instanceof Promise;

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
};

export * from "./date.js";
export * from "./object.js";
export * from "./string.js";
