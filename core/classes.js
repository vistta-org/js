/* eslint-disable no-undef */
import { system, encode, decode, stringify, parse, isPromise, FunctionClass } from "../utils";

const CONTEXT_CACHE_KEY = "Vistta_Context_";
export const Fragment = Symbol("Fragment");
export const TextNode = Symbol("TextNode");
const ComponentNode = Symbol("Component");

export class Element {
  constructor(type, props, ...children) {
    this.props = props || {};
    this.children = children;
    const typeOf = typeof type;
    if (type?.prototype instanceof Component || typeOf === "function") {
      this.type = Component.Node;
      this.props.children = children;
      this.component = type;
    }
    else if (typeOf !== "string" && typeOf !== "symbol") return null;
    else {
      if (props?.ref != null) {
        if (props.ref instanceof Mutation) props.ref = props.ref();
        this.ref = props.ref;
        delete this.props.ref;
      }
      if (props?.key != null) {
        if (props.key instanceof Mutation) props.key = props.key();
        if (typeof props.key === "number") this.key = "" + props?.key;
        else this.key = props?.key;
        delete this.props.key;
      }
      this.type = type;
    }
  }

  toString() {
    const children = this.children?.reduce((acc, cur) => acc + cur, "");
    if (typeof this.type !== "string") return children;
    let attributes = "";
    const attr = Object.keys(this.props || {});
    for (let i = 0, len = attr.length; i < len; i++) {
      const name = attr[i];
      const value = name === "style" ? styleToString(this.props[name]) : this.props[name];
      if (value == null || value === false || ["function", "object"].includes(typeof value)) continue;
      if (value === true) attributes += ` ${name}`;
      else attributes += ` ${name}="${value}"`;
    }
    return `<${this.type}${attributes}>${children}</${this.type}>`;
  }

  clone(props, children) {
    if (props !== false) {
      if (props) {
        const { style, ...rest } = props || {};
        props = Object.assign(cloneProps(this.props), rest);
        props.style = Object.assign(props.style || {}, style || {});
      }
      else props = cloneProps(this.props);
    }
    if (children !== false) children = this?.children?.map((child) => child instanceof Element ? child.clone(undefined, true) : child);
    return new Element(this.type, props, children);
  }
}

export class Mutation extends FunctionClass {
  constructor(callback) {
    super(callback);
    this.callback = callback;
  }
}

export class Context extends FunctionClass {
  #key;
  #value;
  #cache;
  #writable;
  #callback

  constructor(key, defaultValue, cache, actions, controllers) {
    if (typeof key !== "string" || key.length == 0) return null;
    super(() => this);
    this.#key = key;
    this.#value = (cache !== "none" ? getCacheValue(key) : undefined) ?? defaultValue;
    this.#cache = cache || "none";
    if (!actions || typeof actions === "boolean") this.#writable = actions !== false;
    else {
      this.#writable = false;
      const actionsNames = Object.keys(actions || {});
      if (actionsNames.length > 0) {
        const controllerFn = (target, ...args) => typeof controllers === "function" ? controllers.call(this, target, ...args) : controllers?.[target]?.call(this, ...args);
        const updateValue = (value) => {
          if (this.#value === value) return;
          this.#value = value;
          if (this.#cache !== "none") updateCache(this.#key, value, this.#cache);
          this.#callback?.();
        }
        for (let i = 0, len = actionsNames.length; i < len; i++) {
          const actionName = actionsNames[i];
          if (["valueOf", "toString", "setValue", "register"].includes(actionName)) throw new Error(`Invalid action name "${actionName}".`);
          const action = actions[actionName];
          this[actionName] = ((...args) => {
            controllerFn(actionName, "pending", this.valueOf());
            const controller = new AbortController();
            const promise = new Promise((resolve) => {
              controller.signal.onabort = () => {
                controllerFn(actionName, "rejected", controller.signal.reason);
                resolve(null);
              };
              try {
                let value = action(this.valueOf(), ...args);
                if (isPromise(value)) value.then((result) => {
                  if (controller.signal?.aborted) return;
                  updateValue(result);
                  resolve(this.valueOf());
                  controllerFn(actionName, "completed", this.valueOf());
                }).catch((e) => {
                  controllerFn(actionName, "rejected", e);
                  resolve(null);
                });
                else if (!controller.signal?.aborted) {
                  updateValue(value);
                  resolve(this.valueOf());
                  controllerFn(actionName, "completed", this.valueOf());
                }
              } catch (e) {
                controllerFn(actionName, "rejected", e);
                resolve(null);
              }
            });
            promise.abort = (...args) => controller.abort(...args);
            return promise;
          }).bind(this);
        }
      }
    }
  }

  get key() {
    return this.#key;
  }

  get writable() {
    return this.#writable;
  }

  valueOf() {
    return this.#value;
  }

  toString() {
    return "" + this.#value;
  }

  setValue(value) {
    if (!this.#writable || this.#value === value) return;
    this.#value = value;
    if (this.#cache !== "none") updateCache(this.#key, value, this.#cache);
    this.#callback?.();
  }

  register(callback) {
    this.#callback = callback;
  }
}

export class Ref {
  constructor(initialValue) {
    this.node = initialValue;
  }
}

export class Component {
  children = [];
  static get Node() { return ComponentNode; }

  constructor() {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === 'undefined' && typeof descriptor.set === 'undefined')
        this[functions[i]] = this[functions[i]].bind(this);
    }
  }
}

export class Suspense extends Component {
  #count = 0;
  #callback;
  #dequeued = false;
  fallback;

  register(callback) {
    if (this.#callback != null) throw "Internal Error #004";
    this.#callback = callback;
  }

  wait() {
    this.#count++;
  }

  resolve(dequeued) {
    if (dequeued) this.#dequeued = true;
    else this.#count--;
    if (this.#count == 0 && this.#dequeued) this.#callback();
  }
}

export class Profiler extends Component {
  callback;
  idle = 250;
  #total = 0;
  #debounce;

  render() {
    if (!this.callback || process.env.IS_NODE || "production" === process.env.NODE_ENV) return this.children;
    let start = performance.now();
    const callback = this.callback;
    return new Element(Fragment, null, ...this.children, new Element(class extends Component {
      onConnect() {
        callback(performance.now() - start);
      }

      render() {
        return null;
      }
    }));
  }

  record(callback) {
    return () => {
      let initial = performance.now();
      callback();
      this.#total = performance.now() - initial;
      clearTimeout(this.#debounce);
      this.#debounce = setTimeout(() => {
        const total = this.#total;
        this.#total = 0;
        this.callback(total);
      }, this.idle);
    }
  }
}

export const Render = {
  If: class extends Component {
    condition;

    render() {
      return this.condition && this.children;
    }
  },
  Each: class extends Component {
    target;
    callback;

    render() {
      if (typeof this.target !== "object") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each in needs to be either an object or an array");
        return null;
      }
      if (typeof this.callback !== "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each callback needs to be a function");
        return null;
      }
      let result = [];
      if (!Array.isArray(this.target)) {
        const keys = Object.keys(this.target);
        for (let i = 0, len = keys.length; i < len; i++) result.push(this.callback(this.target[keys[i]], keys[i]));
      }
      else for (let i = 0, len = this.target.length; i < len; i++) result.push(this.callback(this.target[i], i));
      return result;
    }
  }
}

export class Try extends Component {
  fallback;

  render() {
    try {
      return this.children;
    } catch {
      return this.fallback;
    }
  }
}

export class Form extends Component {
  static Ref = Ref;
  #node;
  #path = [];
  #parent;
  #fields = {};
  #required = {};
  #validators = {};
  #listeners = {};
  #invalidEvent;
  ref;
  name;
  className;
  autocomplete;
  style;
  onsubmit;
  oninvalid;

  get path() {
    return this.#path;
  }

  onConnect() {
    if (this.#parent || !this.ref || this.ref.node) return;
    Object.assign(this.ref, {
      node: this.#node,
      watch: (...args) => this.watch(...args),
      unwatch: (...args) => this.unwatch(...args),
      reset: (name) => this.reset(name),
      clear: (name) => this.clear(name),
      submit: () => this.submit(),
      values: () => this.values(),
      validate: (name) => this.validate(name)
    });
  }

  render() {
    if (this.#parent) {
      if (!this.name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      if (this.className || this.style) return new Element("div", { className: this.className, style: this.style }, ...children);
      return new Element(Fragment, {}, ...this.children);
    }
    this.#invalidEvent = typeof oninvalid === "function";
    return new Element("form", {
      ref: (element) => this.#node = element,
      className: this.className,
      autocomplete: this.autocomplete,
      onreset: () => this.reset(),
      oninvalid: this.oninvalid,
      onsubmit: (event) => {
        event.preventDefault();
        if (!this.validate()) return;
        event.values = this.values();
        this.onsubmit?.(event);
      },
      style: this.style,
    }, ...this.children);
  }

  register(target) {
    if (target instanceof Form) {
      this.#parent = target;
      this.#path = [...this.#parent.path, this.name];
      return;
    }

    const { element: { type, props }, node } = target || {};
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
    this.#required[props.name] = props.required;
    this.#validators[props.name] = props.validator;
    node.addEventListener(type === "select" ? "change" : "input", (e) => {
      if (!this.#invalidEvent) node.setCustomValidity?.("");
      for (let i = 0, len = this.#listeners[props.name]?.length; i < len; i++) this.#listeners[props.name][i](e);
      for (let i = 0, len = this.#listeners["*"]?.length; i < len; i++) this.#listeners["*"][i](e);
    });
    node.addEventListener("keydown", (e) => e.key === 'Enter' && this.#node?.requestSubmit());
  }

  watch(...args) {
    if (args.length == 0 || this.#parent) return;
    if (args.length == 1) args.unshift("*");
    const [name, listener] = args;
    if (!this.#listeners[name]) {
      this.#listeners[name] = [listener];
      return;
    }
    for (let i = 0, len = this.#listeners[name]?.length; i < len; i++) {
      if (this.#listeners[name][i] === listener) return;
    }
    this.#listeners[name].push(listener);
  }

  unwatch(...args) {
    if (args.length == 0 || this.#parent) return;
    if (args.length == 1) args.unshift("*");
    const [name, listener] = args;
    for (let i = 0, len = this.#listeners[name]?.length; i < len; i++) {
      if (this.#listeners[name][i] === listener) {
        this.#listeners[name].splice(i, 1);
        return;
      }
    }
  }

  reset(name = "*") {
    if (name === "*") {
      const inputs = Object.keys(this.#fields);
      for (let i = 0, len = inputs.length; i < len; i++) {
        this.#fields[inputs[i]].value = getFieldDefaultValue(this.#fields[inputs[i]]);
        if (!this.#invalidEvent) this.#fields[inputs[i]].setCustomValidity?.("");
      }
      return;
    }
    this.#fields[name].value = getFieldDefaultValue(this.#fields[name]);
  }

  validate(name) {
    if (name && !this.#fields[name]) return null;
    let errors = [];
    const inputs = name ? [name] : Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const field = this.#fields[inputs[i]];
      const value = getFieldValue(field);
      if (this.#required[inputs[i]] === true && !value) {
        if (this.#invalidEvent) errors.push({ field, error: DEFAULT_ERROR_MESSAGE });
        else field.setCustomValidity?.(DEFAULT_ERROR_MESSAGE);
        continue;
      }
      const validator = this.#validators[inputs[i]];
      const error = typeof validator === "function" ? validator(value) : null;
      if (typeof error === "string") {
        if (this.#invalidEvent) errors.push({ field, error });
        else field.setCustomValidity?.(error);
      }
      else if (error === false) {
        if (this.#invalidEvent) errors.push({ field, error: DEFAULT_ERROR_MESSAGE });
        else field.setCustomValidity?.(DEFAULT_ERROR_MESSAGE);
      }
      else if (!this.#invalidEvent) field.setCustomValidity?.("");
    }
    if (!this.#invalidEvent) return this.#node.reportValidity();
    if (errors.length === 0) return true;
    const invalidEvent = new Event("invalid");
    invalidEvent.errors = errors;
    this.#node.dispatchEvent(invalidEvent);
    return false;
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
    const values = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const cur = inputs[i];
      if (cur.includes(".")) {
        let temp = values;
        const paths = cur.split(".");
        for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
          const key = paths[n];
          if (n === pathsLen - 1) temp[key] = getFieldValue(this.#fields[cur]);
          else (temp[key] = temp[key] || {}, temp = temp[key])
        }
      }
      else values[cur] = getFieldValue(this.#fields[cur]);
    }
    return values;
  }
}

// Global

system.set("_Fragment", Fragment);
system.set("_Prop", (caller) => new Mutation(caller));
system.set("_Child", (caller) => new Mutation(caller));
system.set("_Element", (id, ...args) => {
  const element = new Element(...args);
  element.id = id;
  return element;
});

//

function cloneProps(props) {
  const clone = (value) => {
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        const cloned = [];
        for (let i = 0, len = value.length; i < len; i++)
          cloned[i] = clone(value[i]);
        return cloned;
      }
      else {
        const cloned = {};
        const keys = Object.keys(value || {});
        for (let i = 0, len = keys.length; i < len; i++)
          cloned[keys[i]] = clone(value[keys[i]]);
        return cloned;
      }
    }
    else return value;
  }
  return clone(props);
}

function styleToString(style) {
  const keys = Object.keys(style || {});
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const value = style[keys[i]];
    if (typeof value === "string") result += ` ${camelCaseToKebabCase(keys[i])}: ${value};`;
  }
  result = result.trim();
  return result === "" ? null : result;
}

function updateCache(key, value, type) {
  const storage = type === "session" ? sessionStorage : localStorage;
  storage.setItem(encode(CONTEXT_CACHE_KEY + key), encode(stringify(value)));
}

function getCacheValue(key) {
  try {
    return parse(decode(localStorage.getItem(encode(CONTEXT_CACHE_KEY + key)))) || undefined;
  } catch {
    return undefined;
  }
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