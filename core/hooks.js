import { indexOf, isBrowser } from "../utils";

export const CONTEXT_KEY = "#app_";
export const CONTEXT = {};
export const INTERNAL = {};

// Context

export function useContext(key) {
  return CONTEXT[CONTEXT_KEY + key];
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

export class State {
  #listeners = [];
  #value;
  #detect;

  constructor(value, detect) {
    this.#value = value;
    this.#detect = detect !== false;
  }

  set(value) {
    if (this.#value === value) return;
    if (typeof value === "function") this.#value = value(this.#value);
    else this.#value = value;
    setTimeout(() => {
      for (let i = 0, len = this.#listeners.length; i < len; i++) this.#listeners[i]();
    }, 0);
  }

  valueOf() {
    if (this.#detect && typeof INTERNAL["dependency"] === "function") INTERNAL["dependency"](this);
    return this.#value;
  }

  toString() {
    if (this.#detect && typeof INTERNAL["dependency"] === "function") INTERNAL["dependency"](this);
    if (this.#value == null || typeof this.#value === "object") return "";
    return `${this.#value}`;
  }

  subscribe(callback) {
    if (isBrowser()) this.#listeners.push(callback);
  }
}
export const useState = (value) => new State(value);

// Effect

class Effect extends State {
  constructor(callback, dependencies) {
    if (!Array.isArray(dependencies)) {
      dependencies = [];
      INTERNAL["dependency"] = (dependency) => dependencies.push(dependency);
      super(callback(), false);
      INTERNAL["dependency"] = null;
    } else super(callback(), false);
    for (let i = 0, len = dependencies.length; i < len; i++) {
      const dependency = unique(dependencies, i);
      if (dependency) dependency.subscribe(() => super.set(callback()));
    }
  }

  set() {
    /* Do Nothing */
  }
}
export const useEffect = (callback, dependencies) => new Effect(callback, dependencies);

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
