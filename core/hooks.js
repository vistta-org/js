/* eslint-disable no-undef */
import { setImmediate, ExtensibleFunction, indexOf } from "../utils";
import { INTERNAL } from "./context";

export const HOOKS_ERROR = "Cannot use hooks outside of components.";

// Context

export function useContext(key) {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
  if (!key?.length) return INTERNAL.COMPONENT.CONTEXT;
  if (!INTERNAL.COMPONENT.CONTEXT[key]) INTERNAL.COMPONENT.CONTEXT[key] = {};
  return INTERNAL.COMPONENT.CONTEXT[key];
}

// Style

export function useStyle(...styles) {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
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
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
  return new Ref(initialValue);
}

// State

export class State extends ExtensibleFunction {
  static type = Symbol("State");
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
        if ("production" !== process.env.NODE_ENV && typeof INTERNAL.PROFILER === "function")
          this.#profilers.add(INTERNAL.PROFILER);
        if (typeof INTERNAL.EFFECTS === "function") INTERNAL.EFFECTS(this);
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
    if (typeof IS_NODE === "undefined") this.#listeners.add(callback);
  }
}

export function useState(value) {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
  return new State(value);
}

// Effect

export const useEffect = (callback, dependencies) => {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
  let removeCallback;
  if (!INTERNAL.COMPONENT.EFFECTS.includes(callback)) INTERNAL.COMPONENT.EFFECTS.push({
    add() {
      if (!Array.isArray(dependencies)) {
        dependencies = [];
        INTERNAL.EFFECTS = (dependency) => dependencies.push(dependency);
        removeCallback = callback(true);
        delete INTERNAL.EFFECTS;
      } else removeCallback = callback(true);
    },
    remove() {
      removeCallback && removeCallback();
    }
  });
  for (let i = 0, len = dependencies.length; i < len; i++) {
    const dependency = unique(dependencies, i);
    if (dependency) dependency.subscribe(() => callback());
  }
};

// Form

export const useForm = (onSubmit) => {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
  const context = INTERNAL.COMPONENT.FORM || {
    fields: {}, path: [], listeners: {}, register({ type, props: { role, name, type: inputType }, node }) {
      if (type !== "input" && type !== "textarea" && type !== "select" && role !== "input") return;
      if (!name && inputType !== "submit") {
        if ("production" !== process.env.NODE_ENV) console.warn(`Missing "name" attribute on ${type} inside of form.`);
        return;
      }
      const path = [...this.path, name].join(".");
      if (inputType === "radio") {
        if (!this.fields[path]) this.fields[path] = [];
        this.fields[path].push(node);
      }
      else this.fields[path] = node;
      if (type === "select") node.defaultValue = node.value;
      node.addEventListener("keydown", (e) => e.key === 'Enter' && this.node?.requestSubmit());
      node.addEventListener(type === "select" ? "change" : "input", (e) => {
        this.listeners[path]?.forEach((listener) => listener(e));
        this.listeners["*"]?.forEach((listener) => listener(e));
      });
    }, values() {
      const value = {};
      const inputs = Object.keys(this.fields);
      for (let i = 0, len = inputs.length; i < len; i++) {
        const cur = inputs[i];
        if (cur.includes(".")) {
          let temp = value;
          const paths = cur.split(".");
          for (let n = 0, nlen = paths.length; n < nlen; n++) {
            const key = paths[n];
            if (n === nlen - 1) temp[key] = getFieldValue(this.fields[cur]);
            else (temp[key] = temp[key] || {}, temp = temp[key])
          }
        }
        else value[cur] = getFieldValue(this.fields[cur]);
      }
      return value;
    }
  };
  const Form = ({ children, name, id, className, style }) => {
    if (INTERNAL.COMPONENT.FORM) {
      if (!name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      if (id || className || style)
        return createElement("div", { id, className, style }, formContext("push", name), ...children, formContext("pop"));
      return createElement(Fragment, {}, formContext("push", name), ...children, formContext("pop"));
    }
    return createElement("form", {
      ref: (e) => context.node = e, onSubmit(event) {
        event.preventDefault();
        event.value = context.values();
        onSubmit(event);
      }, id, className, style
    }, formContext("create", context), ...children, formContext("remove"));
  }
  Form.watch = (...args) => {
    if (args.length == 0) return;
    if (args.length == 1) args.unshift("*");
    const [name, listener] = args;
    if (!context.listeners[name]) context.listeners[name] = [listener];
    else context.listeners[name].push(listener);
  };
  Form.reset = (name = "*") => {
    if (name === "*") {
      const inputs = Object.keys(context.fields);
      for (let i = 0, len = inputs.length; i < len; i++)
        context.fields[inputs[i]].value = getFieldDefaultValue(context.fields[inputs[i]]);
      return;
    }
    context.form[name].value = getFieldDefaultValue(context.form[name]);
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
  Form.values = () => context.values();
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
    if (type === "create" && arg) INTERNAL.COMPONENT.FORM = arg;
    else if (type === "remove") delete INTERNAL.COMPONENT.FORM;
    else if (type === "push" && arg) INTERNAL.COMPONENT.FORM?.path?.push(arg);
    else if (type === "pop") INTERNAL.COMPONENT.FORM?.path?.pop();
    return null;
  });
}

function getFieldValue(element) {
  if (Array.isArray(element)) {
    for (let i = 0, len = element.length; i < len; i++) {
      if (element[i].checked) return element[i].value;
    }
    return null;
  }
  if (element.type === "checkbox") return element.checked;
  return element.value;
}

function getFieldDefaultValue(element) {
  if (Array.isArray(element)) {
    for (let i = 0, len = element.length; i < len; i++) {
      if (element[i].defaultChecked) return element[i].value;
    }
    return null;
  }
  if (element.type === "checkbox") return element.defaultChecked;
  return element.defaultValue;
}