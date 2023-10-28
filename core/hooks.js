/* eslint-disable no-undef */
import { isBrowser, setImmediate, ExtensibleFunction, indexOf } from "../utils";

export const EFFECT_CONTEXT = "#effect";
export const PROFILER_CONTEXT = "#profiler";
export const FORM_CONTEXT = "#form";
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

// Form

export const useForm = (onSubmit) => {
  const context = INTERNAL[FORM_CONTEXT] || {
    fields: {}, path: [], listeners: [], register({ type, props: { role, name }, node }) {
      if (type !== "input" && type !== "textarea" && type !== "select" && role !== "input" || !name) return;
      const path = [...this.path, name].join(".");
      this.fields[path] = node;
      node.addEventListener("change", (e) =>
        this.listeners.forEach(({ name, listener }) => (name === path || name === "*") && listener(e))
      );
    }
  };
  const Form = ({ children, name }) => {
    if (INTERNAL[FORM_CONTEXT]) {
      if (!name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      return createElement(Fragment, {}, formContext("push", name), ...children, formContext("pop"));
    }
    return createElement("form", {
      ref: (e) => context.node = e, onSubmit(event) {
        event.preventDefault();
        const value = {};
        const inputs = Object.keys(context.fields);
        for (let i = 0, len = inputs.length; i < len; i++) {
          const cur = inputs[i];
          if (cur.includes(".")) {
            let temp = value;
            const paths = cur.split(".");
            for (let n = 0, nlen = paths.length; n < nlen; n++) {
              const key = paths[n];
              if (n === nlen - 1) temp[key] = context.fields[cur]?.value;
              else (temp[key] = temp[key] || {}, temp = temp[key])
            }
          }
          else value[cur] = context.fields[cur]?.value;
        }
        event.value = value;
        onSubmit(event);
      }
    }, formContext("create", context), ...children, formContext("remove"));
  }
  Form.watch = (...args) => {
    if (args.length == 0) return;
    if (args.length == 1) args.unshift("*");
    context.listeners.push({ name: args[0], listener: args[1] });
  };
  Form.reset = (name = "*") => {
    if (name === "*") {
      const inputs = Object.keys(context.fields);
      for (let i = 0, len = inputs.length; i < len; i++)
        context.fields[inputs[i]].value = context.fields[inputs[i]].defaultValue;
      return;
    }
    context.form[name].value = context.form[name].defaultValue;
  };
  Form.clear = (name = "*") => {
    if (name === "*") {
      const inputs = Object.keys(context.fields);
      for (let i = 0, len = inputs.length; i < len; i++)
        context.fields[inputs[i]].value = "";
      return;
    }
    context.form[name].value = "";
  };
  Form.submit = () => context.node.requestSubmit();
  return Form;
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

function formContext(type, arg) {
  return createElement(() => {
    if (type === "create" && arg) INTERNAL[FORM_CONTEXT] = arg;
    else if (type === "remove") delete INTERNAL[FORM_CONTEXT];
    else if (type === "push" && arg) INTERNAL[FORM_CONTEXT]?.path?.push(arg);
    else if (type === "pop") INTERNAL[FORM_CONTEXT]?.path?.pop();
    return null;
  });
}
