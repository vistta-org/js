import { indexOf, isBrowser } from "../utils";

export const CONTEXT_KEY = "#app_";
export const CONTEXT = {};

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
let addDependency;

export class State {}
export function useState(value) {
  const listeners = [];
  const state = new State();
  state.set = (x) => {
    if (value === x) return;
    if (typeof x === "function") value = x(value);
    else value = x;
    setTimeout(() => {
      for (let i = 0, len = listeners.length; i < len; i++) listeners[i]();
    }, 0);
  };
  state.valueOf = () => {
    if (typeof addDependency === "function") addDependency(state);
    return value;
  };
  state.toString = () => {
    if (typeof addDependency === "function") addDependency(state);
    if (value == null || typeof value === "object") return "";
    return `${value}`;
  };
  state.subscribe = (callback) => isBrowser() && listeners.push(callback);
  return state;
}

// Effect

class Effect extends State {}
export function useEffect(callback, dependencies) {
  const effect = new Effect();
  const autoDetect = !Array.isArray(dependencies);
  const listeners = [];
  let value;
  if (autoDetect) {
    dependencies = [];
    addDependency = (dependency) => dependencies.push(dependency);
    value = callback();
    addDependency = null;
  } else value = callback();
  for (let i = 0, len = dependencies.length; i < len; i++) {
    const dependency = unique(dependencies, i);
    if (dependency)
      dependency.subscribe(() => {
        value = callback();
        for (let n = 0, nlen = listeners.length; n < nlen; n++) listeners[n]();
      });
  }
  effect.valueOf = () => value;
  effect.toString = () => {
    if (value == null || typeof value === "object") return "";
    return `${value}`;
  };
  effect.subscribe = (callback) => isBrowser() && listeners.push(callback);
  return effect;
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
