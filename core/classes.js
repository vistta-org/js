import {
  FunctionClass,
  assign,
  clone,
  decode,
  defineReadonly,
  encode,
  isPromise,
  parse,
  proxy,
  stringify,
} from "../utils/index.js";

const CONTEXT_CACHE_KEY = "Vistta_Context_";
const DB_NAME = encode("vistta-context-db", "hex");
const STORE_NAME = encode("vistta-context-kv", "hex");
const DB_VERSION = 1;
export const Fragment = Symbol("Fragment");
export const TextNode = Symbol("TextNode");
const ComponentNode = Symbol("Component");

/**
 * @extends {JSX.Element}
 */
export class Element {
  /**
   * @template Props
   * Represents a virtual DOM element.
   * @param {string|Symbol|Function} type - The type of the element, can be a string (HTML tag), a Symbol (custom element), or a Function (Component).
   * @param {Props} [props] - The properties of the element.
   * @param {JSX.Node} [children] - The children of the element, can be other Elements, strings, numbers, or any other type.
   */
  constructor(type, props, ...children) {
    this.props = props || {};
    this.children = children;
    const typeOf = typeof type;
    if (type?.prototype instanceof Component || typeOf === "function") {
      this.type = Component.Node;
      this.props.children = children;
      this.Component = type;
    } else if (typeOf !== "string" && typeOf !== "symbol") this.type = null;
    else {
      if (props?.ref != null) {
        if (props.ref instanceof Mutation) props.ref = props.ref();
        this.ref = props.ref;
        delete this.props.ref;
      }
      this.type = type;
    }
    if (props?.key != null) {
      if (props.key instanceof Mutation) props.key = props.key();
      if (typeof props.key === "number") this.key = "" + props?.key;
      else this.key = props?.key;
      delete this.props.key;
    }
  }

  clone(props, children) {
    if (props !== false) {
      if (props) {
        const { style, ...rest } = props || {};
        props = assign(cloneProps(this.props), rest);
        props.style = assign(props.style || {}, style || {});
      } else props = cloneProps(this.props);
    }
    if (children !== false)
      children = this?.children?.map((child) => (child instanceof Element ? child.clone(undefined, true) : child));
    return new Element(this.type, props, children);
  }
}

export class Mutation extends FunctionClass {
  constructor(id, callback) {
    super(callback);
    this.id = id;
    this.callback = callback;
  }
}

export class Context extends FunctionClass {
  static id = Symbol(encode(CONTEXT_CACHE_KEY.slice(0, -1), "hex"));
  #key;
  #shared = { listeners: [] };

  constructor(key, value, cache, actions, controllers) {
    if (typeof key !== "string" || key.length == 0) throw new Error("TypeError: Invalid context key.");
    if (typeof value !== "object") throw new Error("TypeError: Cannot create context with a non-object value.");
    super(() => this);
    this.#key = key;
    if (!window[Context.id]) window[Context.id] = {};
    if (window[Context.id][encode(this.#key, "hex")]) this.#shared = window[Context.id][encode(this.#key, "hex")];
    else {
      window[Context.id][encode(this.#key, "hex")] = this.#shared;
      this.#shared.cache = getCache(cache);
      try {
        this.#shared.value = clone(value, true);
      } catch {
        throw new Error("TypeError: Cannot create context with a non serializable object as default value.");
      }
      if (this.#shared.cache === indexed) {
        this.#shared.cache
          .getItem(encode(CONTEXT_CACHE_KEY + key, "hex"))
          .then((value) => (this.#shared.value = parse(decode(value, "hex")) ?? this.#shared.value))
          .catch(() => {
            /* Do nothing */
          });
      } else if (this.#shared.cache === sessionStorage || this.#shared.cache === localStorage) {
        try {
          this.#shared.value =
            parse(decode(this.#shared.cache.getItem(encode(CONTEXT_CACHE_KEY + key, "hex")), "hex")) ?? this.#shared.value;
        } catch {
          /* Do nothing */
        }
      }
    }
    if (this.#shared.cache !== getCache(cache))
      throw new Error("Error: Cannot create the same context with different cache types.");
    const actionsNames = Object.keys(actions || {});
    if (actionsNames.length > 0) {
      const controllerFn = (target, status) => {
        const typeOfControllers = typeof controllers;
        if (typeOfControllers === "function") controllers.call(this, target, status, this.value);
        else if (typeOfControllers === "object") controllers?.[target]?.call(this, status, this.value);
      };
      for (let i = 0, len = actionsNames.length; i < len; i++) {
        const actionName = actionsNames[i];
        if (["valueOf", "toString", "setValue", "register", "proxy"].includes(actionName))
          throw new Error(`Invalid action name "${actionName}".`);
        const action = actions[actionName];
        this[actionName] = ((...args) => {
          controllerFn(actionName, "pending");
          const controller = new AbortController();
          const promise = new Promise((resolve) => {
            controller.signal.onabort = () => {
              controllerFn(actionName, "rejected");
              resolve();
            };
            try {
              let value = action(clone(this.#shared.value, true), ...args);
              if (isPromise(value))
                value
                  .then((result) => {
                    if (controller.signal?.aborted) return;
                    assign(this.proxy(), clone(result, true));
                    resolve();
                    controllerFn(actionName, "completed");
                  })
                  .catch(() => {
                    controllerFn(actionName, "rejected");
                    resolve();
                  });
              else if (!controller.signal?.aborted) {
                assign(this.proxy(), clone(value, true));
                resolve();
                controllerFn(actionName, "completed");
              }
            } catch (e) {
              controllerFn(actionName, "rejected");
              throw e;
            }
          });
          promise.abort = (...args) => controller.abort(...args);
          return promise;
        }).bind(this);
      }
    }
  }

  get key() {
    return this.#key;
  }

  get value() {
    if (!this.#shared.readonlyProxy)
      this.#shared.readonlyProxy = proxy(this.#shared.value, {
        readonly: true,
      });
    return this.#shared.readonlyProxy;
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return stringify(this.#shared.value, true);
  }

  proxy(listener) {
    const listeners = this.#shared.listeners;
    if (typeof listener?.set === "function") listeners.push(listener.set);
    if (this.#shared.proxy) return this.#shared.proxy;
    const saveCache =
      this.#shared.cache &&
      (() => {
        try {
          this.#shared.cache.setItem(
            encode(CONTEXT_CACHE_KEY + this.#key, "hex"),
            encode(stringify(this.#shared.value), "hex"),
          );
        } catch (e) {
          console.error(e);
        }
      });
    let debounce;
    this.#shared.proxy = proxy(this.#shared.value, {
      get(path, value) {
        if (typeof listener?.get === "function" && !path.find((cur) => typeof cur !== "string"))
          listener.get(path.join("."), value);
        return value;
      },
      set(path, newValue, oldValue, next) {
        if (oldValue === newValue || stringify(oldValue, true) === stringify(newValue, true)) return true;
        const result = next();
        for (let i = 0, len = listeners.length; i < len; i++) listeners[i](path.join("."), newValue);
        if (!saveCache) return result;
        clearTimeout(debounce);
        debounce = setTimeout(saveCache, 100);
        return result;
      },
    });
    return this.#shared.proxy;
  }
}

// IndexDB

export const indexed = {
  async setItem(key, value) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getItem(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async removeItem(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async clear() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

let dbPromise = null;
function openIndexedDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = (window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB).open(
      DB_NAME,
      DB_VERSION,
    );

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    req.onsuccess = () => {
      const db = req.result;

      // Recommended: close on version upgrade
      db.onversionchange = () => db.close();

      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

/**
 * @template T
 */
export class Ref {
  static forward(ref, callback) {
    return (element) => {
      if (typeof ref === "function") ref(element);
      else if (ref && typeof ref === "object") ref.node = element;
      return callback(element);
    };
  }

  /**
   * @param {T} [initialValue] - The initial value of the reference.
   */
  constructor(initialValue) {
    this.node = initialValue;
  }
}

export class Component {
  children = [];
  static get Node() {
    return ComponentNode;
  }

  constructor() {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === "undefined" && typeof descriptor.set === "undefined")
        this[functions[i]] = this[functions[i]].bind(this);
    }
  }
}

export class Suspense extends Component {
  fallback;
  render() {
    return this.children;
  }
}

export class Profiler extends Component {
  callback;
  #initial;
  #update = 0;

  onConnect() {
    this.callback((this.#initial = performance.now() - this.#initial));
  }

  render() {
    if (!this.callback || "production" === process.env.NODE_ENV) return this.children;
    this.#initial = performance.now();
    return this.children;
  }

  record() {
    let start = performance.now();
    return (callback) => {
      this.#update += performance.now() - start;
      return callback?.(this);
    };
  }

  end() {
    this.callback(this.#update);
    this.#update = 0;
    return this;
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
    of;
    as;

    render() {
      if (typeof this.of !== "object") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each 'of' needs to be either an object or an array");
        return null;
      }
      if (typeof this.as !== "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each 'as' needs to be a function");
        return null;
      }
      let result = [];
      if (!Array.isArray(this.of)) {
        const keys = Object.keys(this.of);
        for (let i = 0, len = keys.length; i < len; i++) result.push(this.as(this.of[keys[i]], keys[i]));
      } else for (let i = 0, len = this.of.length; i < len; i++) result.push(this.as(this.of[i], i));
      return result;
    }
  },
};

export class Safe extends Component {
  error;
  fallback;
  render() {
    if (this.error) return typeof this.fallback === "function" ? this.fallback(this.error) : this.fallback;
    return this.children;
  }
}

export class Form extends Component {
  static Ref = Ref;
  static Context = class extends Context {
    constructor(key, cache) {
      super(key, {}, cache, {
        update: (prev, path, element) => copyFieldValue(prev, path, element),
      });
    }
  };

  static get DEFAULT_ERROR_MESSAGE() {
    if (window.isServer) return "";
    if (!this._defaultErrorMessage) {
      const inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.required = true;
      this._defaultErrorMessage = inputElement.validationMessage;
    }
    return this._defaultErrorMessage;
  }

  ref;
  context;
  class;
  autocomplete;
  onsubmit;
  onSubmit;
  oninvalid;
  onInvalid;
  style;

  #node;
  #path = [];
  #parent;
  #fields = {};
  #defaultValues = {};
  #required = {};
  #validators = {};
  #listeners = {};
  #invalidEvent;

  get path() {
    return this.#path;
  }

  render() {
    if (this.context && !(this.context instanceof Form.Context)) {
      console.warn("Form 'context' needs to be an instance of Form.Context.");
      this.context = null;
    }
    if (this.#parent) {
      if (!this.name) {
        if ("production" !== process.env.NODE_ENV) console.warn("Nested Forms require a 'name' property to be specified.");
        return null;
      }
      if (this.class || this.style) return new Element("div", { class: this.class, style: this.style }, ...this.children);
      return new Element(Fragment, {}, ...this.children);
    }
    this.#invalidEvent = typeof this.oninvalid === "function" || typeof this.onInvalid === "function";
    return new Element(
      "form",
      {
        ref: Ref.forward(this.ref, (element) => {
          if (this.#parent || !element) return;
          this.#node = element;
          Object.assign(element, {
            watch: (...args) => this.watch(...args),
            unwatch: (...args) => this.unwatch(...args),
            reset: (name) => this.reset(name),
            clear: (name) => this.clear(name),
            submit: () => this.submit(),
            values: () => this.values(),
            validate: (name) => this.validate(name),
          });
        }),
        class: this.class,
        autocomplete: this.autocomplete,
        onreset: () => this.reset(),
        oninvalid: this.oninvalid || this.onInvalid,
        onsubmit: (event) => {
          event.preventDefault();
          if (!this.validate()) return;
          event.values = this.values();
          if (typeof this.onsubmit === "function") this.onsubmit?.(event);
          else if (typeof this.onSubmit === "function") this.onSubmit?.(event);
        },
        style: this.style,
      },
      ...this.children,
    );
  }

  register(target) {
    if (target instanceof Form) {
      this.#parent = target;
      this.#path = [...this.#parent.path, this.name || this.id];
      return;
    }

    const { type, attributes, node } = target || {};

    if (
      !node ||
      (type !== "input" && type !== "textarea" && type !== "select" && attributes.role !== "input") ||
      attributes.type === "submit"
    )
      return;
    const path = attributes.name || attributes.id;
    if (!path) {
      if ("production" !== process.env.NODE_ENV)
        console.warn(`Missing either "id" or "name" attribute on ${type} inside of form.`);
      return;
    }
    if (attributes.type === "radio") {
      if (!this.#fields[path]) this.fields[path] = [];
      this.#fields[path].push(node);
    } else this.#fields[path] = node;
    this.#defaultValues[path] = getFieldValue(node);
    if (this.#parent)
      return this.#parent.register({
        type,
        props: { name: [...this.path, path].join("."), ...attributes },
        node,
      });
    this.#required[path] = attributes.required;
    this.#validators[path] = attributes.validator instanceof Mutation ? attributes.validator() : attributes.validator;
    this.context?.update?.(path, node);
    node.addEventListener(type === "select" ? "change" : "input", (e) => {
      if (!this.#invalidEvent) node.setCustomValidity?.("");
      this.context?.update?.(path, node);
      for (let i = 0, len = this.#listeners[path]?.length; i < len; i++) this.#listeners[path][i](e);
      for (let i = 0, len = this.#listeners["*"]?.length; i < len; i++) this.#listeners["*"][i](e);
    });
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
        const field = this.#fields[inputs[i]];
        const defaultValue = this.#defaultValues[inputs[i]];
        if (field.value === defaultValue) continue;
        field.value = defaultValue;
        field.dispatchEvent(new Event(field.localName === "select" ? "change" : "input"));
        if (!this.#invalidEvent) field.setCustomValidity?.("");
      }
      return;
    }
    const field = this.#fields[name];
    const defaultValue = this.#defaultValues[name];
    if (field.value === defaultValue) return;
    field.value = defaultValue;
    field.dispatchEvent(new Event(field.localName === "select" ? "change" : "input"));
    if (!this.#invalidEvent) field.setCustomValidity?.("");
  }

  validate(name) {
    if (name && !this.#fields[name]) return null;
    let errors = [];
    const inputs = name ? [name] : Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const field = this.#fields[inputs[i]];
      const value = getFieldValue(field);
      if (this.#required[inputs[i]] === true && !value) {
        if (this.#invalidEvent) errors.push({ field, error: Form.DEFAULT_ERROR_MESSAGE });
        else field.setCustomValidity?.(Form.DEFAULT_ERROR_MESSAGE);
        continue;
      }
      const validator = this.#validators[inputs[i]];
      const error = typeof validator === "function" ? validator(value) : null;
      if (typeof error === "string") {
        if (this.#invalidEvent) errors.push({ field, error });
        else field.setCustomValidity?.(error);
      } else if (error === false) {
        if (this.#invalidEvent) errors.push({ field, error: Form.DEFAULT_ERROR_MESSAGE });
        else field.setCustomValidity?.(Form.DEFAULT_ERROR_MESSAGE);
      } else if (!this.#invalidEvent) field.setCustomValidity?.("");
    }
    if (!this.#invalidEvent && this.#node?.reportValidity) return this.#node.reportValidity();
    if (errors.length === 0) return true;
    const invalidEvent = new Event("invalid");
    invalidEvent.errors = errors;
    this.#node.dispatchEvent(invalidEvent);
    return false;
  }

  clear(name = "*") {
    if (name === "*") {
      const inputs = Object.keys(this.#fields);
      for (let i = 0, len = inputs.length; i < len; i++) {
        const field = this.#fields[inputs[i]];
        if (field.value === "") continue;
        field.value = "";
        field.dispatchEvent(new Event(field.localName === "select" ? "change" : "input"));
      }
      return;
    }
    const field = this.#fields[name];
    if (field.value === "") return;
    field.value = "";
    field.dispatchEvent(new Event(field.localName === "select" ? "change" : "input"));
  }

  submit() {
    this.#node.requestSubmit();
  }

  values() {
    const values = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const element = this.#fields[inputs[i]];
      if (!element || element.disabled || !document.body.contains(element)) continue;
      copyFieldValue(values, inputs[i], this.#fields[inputs[i]]);
    }
    return values;
  }
}

// Global

defineReadonly(window, "Fragment", Fragment);
defineReadonly(window, "prop", (id, caller) => new Mutation(id, caller));
defineReadonly(window, "child", (id, caller) => new Mutation(id, caller));
defineReadonly(window, "element", (id, ...args) => {
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
        for (let i = 0, len = value.length; i < len; i++) cloned[i] = clone(value[i]);
        return cloned;
      } else {
        const cloned = {};
        const keys = Object.keys(value || {});
        for (let i = 0, len = keys.length; i < len; i++) cloned[keys[i]] = clone(value[keys[i]]);
        return cloned;
      }
    } else return value;
  };
  return clone(props);
}

function copyFieldValue(obj, path, element) {
  if (path.includes(".")) {
    let temp = obj;
    const paths = path.split(".");
    for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
      const key = paths[n];
      if (n === pathsLen - 1) temp[key] = getFieldValue(element);
      else ((temp[key] = temp[key] || {}), (temp = temp[key]));
    }
  } else obj[path] = getFieldValue(element);
  return obj;
}

function getFieldValue(element) {
  if (Array.isArray(element)) {
    for (let i = 0, len = element.length; i < len; i++) {
      if (element[i].checked) return element[i].value;
    }
    return null;
  }
  if (element.type === "file") return element.files;
  if (element.type === "checkbox") return element.checked;
  return element.value;
}

function getCache(type) {
  switch (type) {
    case "indexed":
    case "db":
    case "indexeddb":
      return indexed;
    case "session":
      return sessionStorage;
    case "local":
    case "storage":
      return localStorage;
  }
}
