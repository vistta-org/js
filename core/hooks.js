import { isBrowser, setImmediate, ExtensibleFunction, indexOf } from "../utils";

export const EFFECT_CONTEXT = "#effect";
export const PROFILER_CONTEXT = "#profiler";
export const HOOK_CONTEXT = "#context";
export const SCOPE_CONTEXT = "#scope";
export const ADDED_EFFECT_EVENT = "node_added";
export const REMOVED_EFFECT_EVENT = "node_removed";
export const INTERNAL = {
  [HOOK_CONTEXT]: {},
  [EFFECT_CONTEXT]: {},
};

// Context

export function useContext(key) {
  if (!key?.length) return INTERNAL[HOOK_CONTEXT];
  if (!INTERNAL[HOOK_CONTEXT][key]) INTERNAL[HOOK_CONTEXT][key] = {};
  return INTERNAL[HOOK_CONTEXT][key];
}

// Style

export function useStyle(...styles) {
  const scope = {};
  for (let i = 0, len = styles.length; i < len; i++) {
    const { id, raw } = styles[i];
    scope[id] = createScope(id, raw);
  }
  // eslint-disable-next-line no-undef
  const Scope = ({ children }) => createElement(Fragment, { scope }, children);
  Scope.scope = scope;
  return Scope;
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
  let removeCallback;
  const lifecycle = (status) => {
    if (status === ADDED_EFFECT_EVENT) {
      if (!Array.isArray(dependencies)) {
        dependencies = [];
        INTERNAL[EFFECT_CONTEXT] = (dependency) => dependencies.push(dependency);
        removeCallback = callback(true);
        INTERNAL[EFFECT_CONTEXT] = null;
      } else removeCallback = callback(true);
    } else if (status === REMOVED_EFFECT_EVENT && removeCallback) removeCallback();
  };
  if (!INTERNAL[SCOPE_CONTEXT].effects) INTERNAL[SCOPE_CONTEXT].effects = [lifecycle];
  else if (!INTERNAL[SCOPE_CONTEXT].effects.includes(callback)) INTERNAL[SCOPE_CONTEXT].effects.push(lifecycle);
  for (let i = 0, len = dependencies.length; i < len; i++) {
    const dependency = unique(dependencies, i);
    if (dependency) dependency.subscribe(() => callback());
  }
};

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
  const add = (value) => {
    const index = indexOf(value, " ", ">", ":");
    if (index === -1) return value + `[scope~="${id}"]`;
    return value.slice(0, index) + `[scope~="${id}"]` + value.slice(index);
  };
  const replacer = (value) => {
    if (value.includes("@") || value.includes("%")) return value;
    if (value.includes(","))
      return value
        .split(",")
        .reduce((acc, c) => `${acc}${add(c)},`, "")
        .slice(0, -1);
    return add(value);
  };
  return code.match(regex) ? code.replace(regex, (v) => replacer(v.trim())) : code;
}
