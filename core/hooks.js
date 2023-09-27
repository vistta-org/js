import { isBrowser, setImmediate, ExtensibleFunction } from "../utils";

export const INTERNAL = {};
export const EFFECT_CONTEXT = "#effect";
export const PROFILER_CONTEXT = "#profiler";
export const HOOK_CONTEXT = "#context";
export const SCOPE_CONTEXT = "#scope";

// Context

export function useContext(key) {
  if (!INTERNAL[HOOK_CONTEXT]) INTERNAL[HOOK_CONTEXT] = {};
  if (!key?.length) return INTERNAL[HOOK_CONTEXT];
  if (!INTERNAL[HOOK_CONTEXT][key]) INTERNAL[HOOK_CONTEXT][key] = {};
  return INTERNAL[HOOK_CONTEXT][key];
}

// Style

export function useStyle(...styles) {
  const scopedStyles = {};
  for (let i = 0, len = styles.length; i < len; i++) {
    const { id, raw } = styles[i];
    scopedStyles[id] = createScope(id, raw);
  }
  if (!INTERNAL[SCOPE_CONTEXT].styles) INTERNAL[SCOPE_CONTEXT].styles = scopedStyles;
  else Object.assign(INTERNAL[SCOPE_CONTEXT].styles, scopedStyles);
}

// Ref

export class Ref {
  current;

  constructor(initialValue) {
    this.current = initialValue;
  }
}

export function useRef(initialValue) {
  return new Ref(initialValue);
}

// State

export class State extends ExtensibleFunction {
  #listeners = new Set();
  #profilers = new Set();
  #value;
  #detect = () => null;

  constructor(value, detect) {
    super((mutator) => {
      if (typeof mutator !== "function") return this.valueOf();
      const mutation = new State(mutator(this.#value));
      const set = mutation.set.bind(mutation);
      this.subscribe(() => set(mutator(this.#value)));
      delete mutation.set;
      return mutation;
    });
    this.#value = value;
    if (detect !== false)
      this.#detect = () => {
        if ("production" !== process.env.NODE_ENV && typeof INTERNAL[PROFILER_CONTEXT] === "function")
          this.#profilers.add(INTERNAL[PROFILER_CONTEXT]);
        if (typeof INTERNAL[EFFECT_CONTEXT] === "function") INTERNAL[EFFECT_CONTEXT](this);
      };
  }

  set(value) {
    if ("production" !== process.env.NODE_ENV) this.#profilers.forEach((callback) => callback(true));
    if (this.#value === value) return;
    if (typeof value === "function") this.#value = value(this.#value);
    else this.#value = value;
    setImmediate(() => {
      this.#listeners.forEach((callback) => callback());
      if ("production" !== process.env.NODE_ENV) this.#profilers.forEach((callback) => callback(false));
    });
  }

  valueOf() {
    this.#detect();
    return this.#value;
  }

  toString() {
    this.#detect();
    if (this.#value == null || typeof this.#value === "object") return "";
    return `${this.#value}`;
  }

  subscribe(callback) {
    if (isBrowser()) this.#listeners.add(callback);
  }
}

export const useState = (value) => new State(value);

// Effect

export const useEffect = (callback, dependencies) => {
  if (!Array.isArray(dependencies)) {
    dependencies = [];
    INTERNAL[EFFECT_CONTEXT] = (dependency) => dependencies.push(dependency);
    callback();
    INTERNAL[EFFECT_CONTEXT] = null;
  } else callback();
  for (let i = 0, len = dependencies.length; i < len; i++) {
    const dependency = unique(dependencies, i);
    if (dependency) dependency.subscribe(() => callback());
  }
};

export function useEvent(event, callback) {
  if (!isBrowser()) return;
  window.addEventListener(event, callback);
}

//

function unique(dependencies, index) {
  const cur = dependencies[index];
  if (!(cur instanceof State)) return null;
  for (let i = 0; i < index; i++) {
    if (dependencies[i] === cur) return null;
  }
  return cur;
}

function createScope(id, code) {
  const regex = /([^{}\s][^{}]*)\s*(?=\{)/g;
  const scope = (value) => {
    if (value.startsWith(":scope")) return `[scope~="${id}"]${value.slice(":scope".length)}`;
    return `[scope~="${id}"] > ${value}`;
  };
  return code.match(regex)
    ? code.replace(regex, (value) => {
        if (value.includes("@") || value.includes("%")) return value;
        if (value.includes(","))
          return value
            .split(",")
            .reduce((acc, c) => `${acc}${scope(c)},`, "")
            .slice(0, -1);
        return scope(value);
      })
    : code;
}
