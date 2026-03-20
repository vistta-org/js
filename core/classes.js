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
/** Marker symbol used to represent JSX fragments. */
export const Fragment = Symbol("Fragment");
/** Marker symbol used to represent plain text nodes. */
export const TextNode = Symbol("TextNode");
const ComponentNode = Symbol("Component");

/**
 * @template Props
 * @extends {JSX.Element}
 */
export class Element {
  /**
   * Represents a virtual DOM element.
   * @param {string|Symbol|Function} type - The type of the element, can be a string (HTML tag), a Symbol (custom element), or a Function (Component).
   * @param {Props} [props] - The properties of the element.
   * @param {JSX.Node[]} [children] - The children of the element, can be other Elements, strings, numbers, or any other type.
   */
  constructor(type, props, ...children) {
    this.props = /** @type {any} */ (props || {});
    this.children = children;
    const typeOf = typeof type;
    if (typeOf === "function") {
      this.type = Component.Node;
      this.props.children = children;
      this.Component = type;
    } else if (typeOf !== "string" && typeOf !== "symbol") this.type = null;
    else {
      if (props?.["ref"] != null) {
        if (props["ref"] instanceof Mutation) this.ref = props["ref"]();
        else this.ref = props["ref"];
        delete this.props.ref;
      }
      this.type = type;
    }
    if (props?.["key"] != null) {
      if (props["key"] instanceof Mutation) props["key"] = props["key"]();
      if (typeof props["key"] === "number") this.key = "" + props["key"];
      else this.key = props["key"];
      delete this.props.key;
    }
  }

  /**
   * Creates a deep-cloned element with optional prop and children overrides.
   * @param {any} [props] - `false` keeps current props reference.
   * @param {any} [children] - `false` keeps current children reference.
   * @returns {Element}
   */
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
    return new Element(this.type, props, ...children);
  }
}

export class Mutation extends FunctionClass {
  /**
   * Wraps a callback so it can be lazily resolved when read as a prop.
   * @param {Function} callback
   */
  constructor(callback) {
    super(callback);
    this.callback = callback;
  }
}

/**
 * @typedef {"pending"|"completed"|"rejected"} ContextActionStatus
 */

/**
 * @template {Record<string, any>} Value
 * @typedef {Record<string, (prev: Value, ...args: any[]) => Value|Promise<Value>>} ContextActions
 */

/**
 * @template {ContextActions<any>} Actions
 * @typedef {{
 *   [K in keyof Actions]:
 *     (...args: Parameters<Actions[K]> extends [any, ...infer Rest] ? Rest : never) =>
 *       Promise<void> & { abort: (...args: any[]) => void }
 * }} ContextActionMethods
 */

/**
 * @typedef {{
 *   get?: (path: string, value: any) => void,
 *   set?: (path: string, value: any) => void,
 * }} ContextProxyListener
 */

/**
 * Shared reactive context with optional persistence and action helpers.
 * @template {Record<string, any>} Value
 * @template {ContextActions<Value>} [Actions=ContextActions<Value>]
 */
export class Context extends FunctionClass {
  static id = Symbol(encode(CONTEXT_CACHE_KEY.slice(0, -1), "hex"));
  #key;
  #shared = { listeners: [] };

  /**
   * @param {string} key - Unique context key.
   * @param {Value} value - Default context value.
   * @param {"none"|"session"|"local"|"storage"} [cache] - Optional persistence backend.
   * @param {Actions} [actions] - Named mutating actions assigned as context instance methods.
   * @param {any} [controllers]
   */
  constructor(key, value, cache, actions, controllers) {
    if (typeof key !== "string" || key.length == 0) throw new Error("TypeError: Invalid context key.");
    if (typeof value !== "object") throw new Error("TypeError: Cannot create context with a non-object value.");
    super(() => this);
    this.#key = key;
    if (!window[Context.id]) window[Context.id] = {};
    if (window[Context.id][encode(this.#key, "hex")]) this.#shared = window[Context.id][encode(this.#key, "hex")];
    else {
      window[Context.id][encode(this.#key, "hex")] = this.#shared;
      this.#shared.cache = this.#cache(cache);
      try {
        this.#shared.value = clone(value, true);
      } catch {
        throw new Error("TypeError: Cannot create context with a non serializable object as default value.");
      }
      if (this.#shared.cache === sessionStorage || this.#shared.cache === localStorage) {
        try {
          this.#shared.value =
            parse(decode(this.#shared.cache.getItem(encode(CONTEXT_CACHE_KEY + key, "hex")), "hex")) ?? this.#shared.value;
        } catch {
          /* Do nothing */
        }
      }
    }
    if (this.#shared.cache !== this.#cache(cache))
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
        if (["valueOf", "toString", "setValue", "proxy"].includes(actionName))
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
                    this.#replace(result);
                    resolve();
                    controllerFn(actionName, "completed");
                  })
                  .catch(() => {
                    controllerFn(actionName, "rejected");
                    resolve();
                  });
              else if (!controller.signal?.aborted) {
                this.#replace(value);
                resolve();
                controllerFn(actionName, "completed");
              }
            } catch (e) {
              controllerFn(actionName, "rejected");
              throw e;
            }
          });
          /** @type {any} */ (promise).abort = (...args) => controller.abort(...args);
          return promise;
        }).bind(this);
      }
    }
  }

  /** @returns {string} */
  get key() {
    return this.#key;
  }

  /**
   * Returns a readonly proxy of the current context value.
   * @returns {Record<string, any>}
   */
  get value() {
    if (!this.#shared.readonlyProxy)
      this.#shared.readonlyProxy = proxy(this.#shared.value, {
        readonly: true,
      });
    return this.#shared.readonlyProxy;
  }

  /** @returns {Record<string, any>} */
  valueOf() {
    return this.value;
  }

  /** @returns {string} */
  toString() {
    return stringify(this.#shared.value, true);
  }

  /**
   * Returns a mutable proxy to the context value and optionally subscribes to changes.
   * @param {ContextProxyListener} [listener]
   * @returns {Record<string, any>}
   */
  proxy(listener) {
    if (typeof listener?.set === "function") this.#shared.listeners.push(listener.set);
    if (this.#shared.proxy) return this.#shared.proxy;
    const instance = this;
    const update = (path) => this.#update(path);
    return (this.#shared.proxy = proxy(this.#shared.value, {
      get(path, value) {
        if (typeof listener?.get === "function" && !path.find((cur) => typeof cur !== "string"))
          listener.get(path.join("."));
        return value;
      },
      set(path, newValue, oldValue, next) {
        if (oldValue === newValue) return true;
        return (update(path), next());
      },
      getPrototypeOf() {
        return instance;
      },
    }));
  }

  #replace(value) {
    const helper = (object, target, path = []) => {
      if (typeof object !== "object" || object === null) return;
      const hasTarget = typeof target === "object" && target !== null;
      if (hasTarget) {
        const keysToAssign = Object.keys(target);
        for (let i = 0, len = keysToAssign.length; i < len; i++) {
          const key = keysToAssign[i];
          const nextValue = target[key];
          if (typeof nextValue === "object" && nextValue !== null) {
            if (Array.isArray(nextValue)) {
              object[key] = nextValue.slice();
              this.#update([...path, key]);
            } else {
              const currentValue = object[key];
              if (typeof currentValue !== "object" || currentValue === null || Array.isArray(currentValue)) object[key] = {};
              helper(object[key], nextValue, [...path, key]);
            }
          } else if (object[key] !== nextValue) {
            object[key] = nextValue;
            this.#update([...path, key]);
          }
        }
      }
      const keys = Object.keys(object);
      for (let i = 0, len = keys.length; i < len; i++) {
        const key = keys[i];
        if (hasTarget && Object.prototype.hasOwnProperty.call(target, key)) continue;
        const currentValue = object[key];
        if (typeof currentValue === "object" && currentValue !== null) helper(currentValue, null, [...path, key]);
        object[key] = undefined;
      }
    };
    helper(this.#shared.value, value);
  }

  #update(path) {
    while (path.length >= 1) {
      for (let i = 0, len = this.#shared.listeners.length; i < len; i++) this.#shared.listeners[i](path.join("."));
      path.pop();
    }
    if (!this.#shared.cache) return;
    clearTimeout(this.#shared.debounce);
    this.#shared.debounce = setTimeout(() => {
      try {
        this.#shared.cache.setItem(
          encode(CONTEXT_CACHE_KEY + this.#key, "hex"),
          encode(stringify(this.#shared.value), "hex"),
        );
      } catch (e) {
        console.error(e);
      }
    }, 100);
  }

  #cache(type) {
    switch (type) {
      case "session":
        return sessionStorage;
      case "local":
      case "storage":
        return localStorage;
    }
  }
}

/**
 * @template [Element=any]
 */
export class Ref {
  /**
   * Composes an external ref with an internal callback.
   * @template T
   * @param {any[]} args
   * @returns {(node: T) => any}
   */
  static forward(...args) {
    return (element) => {
      for (let i = 0, len = args.length; i < len; i++) Ref.assign(args[i], element);
    };
  }

  /**
   * Assigns a value to a ref, supporting both callback and object refs.
   * @template T
   * @param {any} ref
   * @param {T} value
   */
  static assign(ref, value) {
    if (typeof ref === "function") ref(value);
    else if (typeof ref == "object" && ref) ref.node = value;
  }

  /**
   * @param {Element} [initialValue] - The initial value of the reference.
   */
  constructor(initialValue) {
    this.node = initialValue;
  }
}

/**
 * @template [Props=Record<string, any>]
 */
export class Component {
  children = [];

  /** Symbol used by the renderer to identify component elements. */
  static get Node() {
    return ComponentNode;
  }

  /**
   * @param {Props} [props]
   */
  // eslint-disable-next-line no-unused-vars
  constructor(props) {
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

  /** @returns {JSX.Node|JSX.Node[]} */
  render() {
    return this.children;
  }
}

export class Profiler extends Component {
  callback;
  #initial;
  #update = 0;

  /** Triggers the initial render duration callback after component mount. */
  onConnect() {
    this.callback((this.#initial = performance.now() - this.#initial));
  }

  /** @returns {JSX.Node|JSX.Node[]} */
  render() {
    if (!this.callback || "production" === process.env.NODE_ENV) return this.children;
    this.#initial = performance.now();
    return this.children;
  }

  /**
   * Starts a measurement section and returns a function that closes it.
   * @returns {(callback?: (profiler: Profiler) => any) => any}
   */
  record() {
    let start = performance.now();
    return (callback) => {
      this.#update += performance.now() - start;
      return callback?.(this);
    };
  }

  /**
   * Emits accumulated update time and resets internal counters.
   * @returns {Profiler}
   */
  end() {
    this.callback(this.#update);
    this.#update = 0;
    return this;
  }
}

/**
 * Utility components for conditional and iterable rendering.
 */
export const Render = {
  If: class extends Component {
    condition;

    /** @returns {JSX.Node|JSX.Node[]|false|null|undefined} */
    render() {
      return this.condition && this.children;
    }
  },
  Each: class extends Component {
    of;
    as;

    /** @returns {JSX.Node[]|null} */
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

  /** @returns {JSX.Node|JSX.Node[]|null} */
  render() {
    if (this.error) return typeof this.fallback === "function" ? this.fallback(this.error) : this.fallback;
    return this.children;
  }
}

/**
 * @typedef {{
 *   type: string,
 *   attributes: Record<string, any>,
 *   node: any,
 * }} FormRegisterTarget
 */

/**
 * Form component with validation, watch APIs and optional shared context.
 */
export class Form extends Component {
  /** Reference helper exposed for convenience. */
  static Ref = Ref;

  /**
   * Context specialized for form values where updates are path-based.
   */
  static Context = class extends Context {
    /**
     * @param {string} key
     * @param {"none"|"session"|"local"|"storage"} [cache]
     */
    constructor(key, cache) {
      super(key, {}, cache, {
        update: (prev, path, element) => copyFieldValue(prev, path, element),
      });
    }
  };

  /**
   * Browser default required-field message. Empty on server.
   * @returns {string}
   */
  static get DEFAULT_ERROR_MESSAGE() {
    if (/** @type {any} */ (window).isServer) return "";
    if (!this._defaultErrorMessage) {
      const inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.required = true;
      this._defaultErrorMessage = inputElement.validationMessage;
    }
    return this._defaultErrorMessage;
  }

  ref;
  name;
  id;
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

  /** Path of this form when nested inside another form. */
  get path() {
    return this.#path;
  }

  /** @returns {Element} */
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

  /**
   * Registers either a parent form (for nesting) or a field target.
   * @param {Form|FormRegisterTarget} target
   * @returns {void}
   */
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
      if (!this.#fields[path]) this.#fields[path] = [];
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

  /**
   * Watches one field or all fields (`*`) for input/change events.
   * @param {...any} args
   */
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

  /**
   * Removes a field watcher previously registered with `watch`.
   * @param {...any} args
   */
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

  /**
   * Resets one field or all fields to their initial values.
   * @param {string} [name="*"]
   */
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

  /**
   * Validates one field or the full form.
   * @param {string} [name]
   * @returns {boolean|null}
   */
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
    /** @type {any} */ (invalidEvent).errors = errors;
    this.#node.dispatchEvent(invalidEvent);
    return false;
  }

  /**
   * Clears one field or all fields.
   * @param {string} [name="*"]
   */
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

  /** Submits the form programmatically. */
  submit() {
    this.#node.requestSubmit();
  }

  /**
   * Returns a plain object with current field values.
   * @returns {Record<string, any>}
   */
  values() {
    const values = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) {
      const element = this.#fields[inputs[i]];
      if (!element || !element.isConnected || element.disabled) continue;
      copyFieldValue(values, inputs[i], this.#fields[inputs[i]]);
    }
    return values;
  }
}

// Global

defineReadonly(window, "Fragment", Fragment);
defineReadonly(window, "prop", (caller) => new Mutation(caller));
defineReadonly(window, "child", (caller) => new Mutation(caller));
defineReadonly(window, "element", (type, props, ...children) => new Element(type, props, ...children));

//

/**
 * Deep-clones props objects/arrays to avoid reference sharing.
 * @param {any} props
 * @returns {any}
 */
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

/**
 * Copies an input value into an object, supporting dot-notated paths.
 * @param {Record<string, any>} obj
 * @param {string} path
 * @param {any} element
 * @returns {Record<string, any>}
 */
function copyFieldValue(obj, path, element) {
  if (path.includes(".")) {
    let cur = obj;
    const paths = path.split(".");
    for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
      const key = paths[n];
      if (n === pathsLen - 1) cur[key] = getFieldValue(element);
      else {
        if (!cur[key]) cur[key] = {};
        cur = cur[key];
      }
    }
  } else obj[path] = getFieldValue(element);
  return obj;
}

/**
 * Returns the semantic value for a form field node.
 * @param {any} element
 * @returns {any}
 */
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
