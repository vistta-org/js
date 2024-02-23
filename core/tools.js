/* eslint-disable no-undef */
import { BaseClass, BaseFunction } from "../utils";

export const INTERNAL = {}

// Context

export class Context {
  constructor(key) {
    if (!key?.length) return null;
    if (!INTERNAL.CONTEXT["#" + key]) INTERNAL.CONTEXT["#" + key] = {};
    return INTERNAL.CONTEXT["#" + key];
  }
}

export const context = (key) => new Context(key);

// Ref

export class Ref extends BaseClass {
  current;

  constructor(initialValue) {
    super();
    this.current = initialValue;
  }
}

export const ref = (initialValue) => new Ref(initialValue);

// State

export class State extends BaseFunction {
  static type = Symbol("State");
  #listeners = [];
  #value;
  #status;

  get status() {
    return this.#status;
  }

  constructor(value) {
    super((mutator) => {
      if (typeof mutator !== "function") return this.valueOf();
      const mutation = new State();
      delete mutation.set;
      mutation.valueOf = () => {
        if (typeof INTERNAL.EFFECT === "function") INTERNAL.EFFECT(this);
        return mutator(this.#value, this.#status);
      }
      mutation.toString = () => {
        if (typeof INTERNAL.EFFECT === "function") INTERNAL.EFFECT(this);
        const result = mutator(this.#value, this.#status);
        if (result == null || typeof result === "object") return "";
        return `${result}`;
      }
      mutation.subscribe = (callback) => this.subscribe(callback);
      return mutation;
    });
    if (value instanceof Promise) {
      INTERNAL.SUSPENSE?.wait();
      this.#status = "pending";
      value.then((resolved) => {
        INTERNAL.SUSPENSE?.resolve();
        this.#status = "resolved";
        this.set(resolved);
      }).catch((error) => {
        INTERNAL.SUSPENSE?.resolve();
        this.#status = "rejected";
        this.set(error);
      })
    }
    else this.#value = value;
  }

  set(value) {
    if (this.#value === value) return;
    if (typeof value === "function") this.#value = value(this.#value);
    else this.#value = value;
    for (let i = 0, len = this.#listeners.length; i < len; i++)
      this.#listeners[i]();
  }

  valueOf() {
    if (typeof INTERNAL.EFFECT === "function") INTERNAL.EFFECT(this);
    return this.#value;
  }

  toString() {
    if (typeof INTERNAL.EFFECT === "function") INTERNAL.EFFECT(this);
    if (this.#value == null || typeof this.#value === "object") return "";
    return `${this.#value}`;
  }

  subscribe(callback) {
    if (process.env.IS_NODE) return;
    for (let i = 0, len = this.#listeners.length; i < len; i++) {
      if (this.#listeners[i] === callback) return;
    }
    this.#listeners.push(callback);
  }

  unsubscribe(callback) {
    if (process.env.IS_NODE) return;
    for (let i = 0, len = this.#listeners.length; i < len; i++) {
      if (this.#listeners[i] === callback) {
        this.#listeners.splice(i, 1);
        return;
      }
    }
  }
}

export const state = (value) => new State(value);

// Effect
export class Effect {
  #callback;
  #dependencies;
  #detect;
  #subscribeCallback;
  constructor(callback, dependencies) {
    if (!INTERNAL.EFFECTS) {
      if (process.env.NODE_ENV === "development") console.warn("Invalid effect placement");
      return null;
    }
    this.#callback = callback;
    this.#detect = !Array.isArray(dependencies);
    this.#dependencies = dependencies;
    if (!INTERNAL.EFFECTS.includes(this)) INTERNAL.EFFECTS.push(this);
    else console.warn("IT IS POSSIBLE THAT AN EFFECT CAN BE READDED TO THE LIST");
  }

  subscribe() {
    if (this.#detect) {
      this.#dependencies = [];
      INTERNAL.EFFECT = (dependency) => this.#dependencies.push(dependency);
      this.#subscribeCallback = this.#callback(true);
      delete INTERNAL.EFFECT;
    } else this.#subscribeCallback = this.#callback(true);
    for (let i = 0, len = this.#dependencies.length; i < len; i++) {
      const dependency = unique(this.#dependencies, i);
      if (dependency) dependency.subscribe(this.#callback);
    }
  }

  unsubscribe() {
    if (this.#subscribeCallback) this.#subscribeCallback();
    for (let i = 0, len = this.#dependencies.length; i < len; i++) {
      const dependency = unique(this.#dependencies, i);
      if (dependency) dependency.unsubscribe(this.#callback);
    }
  }
}

export const effect = (callback, dependencies) => new Effect(callback, dependencies);

// Form

export class Form extends BaseFunction {
  #node;
  #path = [];
  #parent;
  #fields = {};
  #validations = {};
  #listeners = {};

  constructor() {
    super((props) => this.render(props));
  }

  get path() {
    return this.#path;
  }

  render({ children, onSubmit, onsubmit, ...props }) {
    if (INTERNAL.CONTEXT.form) {
      if (!props.name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      this.#parent = INTERNAL.CONTEXT.form;
      this.#path = [...this.#parent.path, props.name];
      INTERNAL.CONTEXT.form = this;
      return Object.keys(props)?.length > 1 ? createElement("div", props, ...children) : createElement(Fragment, {}, ...children);
    }
    INTERNAL.CONTEXT.form = this;
    props.ref = (element) => this.#node = element;
    onSubmit = onSubmit || onsubmit;
    props.onSubmit = (event) => {
      event.preventDefault();
      event.values = this.values();
      if (onSubmit) onSubmit(event);
    }
    return createElement("form", props, ...children);
  }

  register({ type, props, node } = {}) {
    if (!node || type !== "input" && type !== "textarea" && type !== "select" && props.role !== "input" || props.type === "submit") return;
    if (!props.name) {
      if ("production" !== process.env.NODE_ENV) console.warn(`Missing "name" attribute on ${type} inside of form.`);
      return;
    }
    if (props.type === "radio") {
      if (!this.#fields[props.name]) this.fields[props.name] = [];
      this.#fields[props.name].push(node);
    }
    else this.#fields[props.name] = node;
    if (type === "select") node.defaultValue = node.value;
    if (this.#parent) return this.#parent.register({ type, props: { name: [...this.path, props.name].join("."), ...props }, node });
    if (props.pattern) this.#validations[props.name] = props.pattern;
    node.addEventListener(type === "select" ? "change" : "input", (e) => {
      for (let i = 0, len = this.#listeners[props.name]?.length; i < len; i++) this.#listeners[props.name][i](e);
      for (let i = 0, len = this.#listeners["*"]?.length; i < len; i++) this.#listeners["*"][i](e);
    });
    node.addEventListener("keydown", (e) => e.key === 'Enter' && this.#node?.requestSubmit());
  }

  watch(...args) {
    if (args.length == 0) return;
    if (args.length == 1) args.unshift("*");
    const [name, listener] = args;
    if (this.#parent) return this.#parent.watch([...this.path, name].join("."), listener);
    if (!this.#listeners[name]) this.#listeners[name] = [listener];
    else this.#listeners[name].push(listener);
  }

  reset(name = "*") {
    if (name === "*") {
      const inputs = Object.keys(this.#fields);
      for (let i = 0, len = inputs.length; i < len; i++)
        this.#fields[inputs[i]].value = getFieldDefaultValue(this.#fields[inputs[i]]);
      return;
    }
    this.#fields[name].value = getFieldDefaultValue(this.#fields[name]);
  }

  validate() {

  }

  clear(name = "*") {
    if (name === "*") {
      const inputs = Object.keys(this.#fields);
      for (let i = 0, len = inputs.length; i < len; i++)
        this.#fields[inputs[i]].value = "";
      return;
    }
    this.#fields[name].value = "";
  }

  submit() {
    this.#node.requestSubmit();
  }

  values() {
    const value = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const cur = inputs[i];
      if (cur.includes(".")) {
        let temp = value;
        const paths = cur.split(".");
        for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
          const key = paths[n];
          if (n === pathsLen - 1) temp[key] = getFieldValue(this.#fields[cur]);
          else (temp[key] = temp[key] || {}, temp = temp[key])
        }
      }
      else value[cur] = getFieldValue(this.#fields[cur]);
    }
    return value;
  }
}

export const form = () => new Form();

//

function unique(dependencies, index) {
  const cur = dependencies[index];
  if (!(cur instanceof State)) return null;
  for (let i = 0; i < index; i++) {
    if (dependencies[i] === cur) return null;
  }
  return cur;
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