import {
  FunctionClass,
  assign,
  clone,
  decode,
  defineReadonly,
  encode,
  equals,
  isPromise,
  parse,
  proxy,
  stringify,
} from "../utils/index.js";

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
    if (this.Component) {
      if (children !== false) {
        const source = this.props.children || [];
        children = source.map((child) => (child instanceof Element ? child.clone(undefined, true) : child));
      }
      return new Element(this.Component, props, ...children);
    }
    if (children !== false)
      children = this?.children?.map((child) => (child instanceof Element ? child.clone(undefined, true) : child));
    return new Element(this.type, props, ...children);
  }
}

export class Mutation extends FunctionClass {
  /**
   * The mutation currently capturing reactive reads. Set by the renderer while
   * evaluating a mutation's callback so that property getters can link the
   * mutation to the sets they read from.
   * @type {Mutation|null}
   */
  static current = null;

  /**
   * Wraps a callback so it can be lazily resolved when read as a prop.
   * @param {Function} callback
   */
  constructor(callback) {
    super(callback);
    this.callback = callback;
    /** @type {Set<Set<Mutation>>|undefined} */
    this.tracked = undefined;
    /** @type {boolean|undefined} */
    this.disabled = undefined;
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
  static id = Symbol("Vistta.Context");
  #key;
  #shared = { listeners: [], events: {} };

  /**
   * @param {string} key - Unique context key.
   * @param {Value} value - Default context value.
   * @param {object} [options]
   * @param {"none"|"session"|"local"|"storage"} [options.cache] - Optional persistence backend.
   * @param {Actions} [options.actions] - Named mutating actions assigned as context instance methods.
   * @param {boolean} [options.encode] - Whether to encode the cache key. Defaults to false.
   */
  constructor(key, value, { cache, actions, encode: encodeCache } = {}) {
    if (typeof key !== "string" || key.length == 0) throw new Error("TypeError: Invalid context key.");
    if (typeof value !== "object") throw new Error("TypeError: Cannot create context with a non-object value.");
    super(() => this);
    this.#key = key;
    if (!window[Context.id]) window[Context.id] = {};
    if (window[Context.id][encode(this.#key, "hex")]) this.#shared = window[Context.id][encode(this.#key, "hex")];
    else {
      window[Context.id][encode(this.#key, "hex")] = this.#shared;
      this.#shared.cache = this.#cache(cache);
      this.#shared.key = encodeCache ? encode(key, "hex") : key;
      try {
        this.#shared.value = clone(value, true);
      } catch {
        throw new Error("TypeError: Cannot create context with a non serializable object as default value.");
      }
      if (this.#shared.cache === sessionStorage || this.#shared.cache === localStorage) {
        try {
          this.#shared.value = parse(decode(this.#shared.cache.getItem(this.#shared.key), "hex")) ?? this.#shared.value;
        } catch {
          /* Do nothing */
        }
      }
    }
    if (this.#shared.cache !== this.#cache(cache))
      throw new Error("Error: Cannot create the same context with different cache types.");
    const actionsNames = Object.keys(actions || {});
    if (actionsNames.length > 0) {
      const emit = (target, status) => {
        const handlers = this.#shared.events[target];
        if (handlers) for (let i = 0, len = handlers.length; i < len; i++) handlers[i](status, this.value);
        if (status === "completed") {
          const changeHandlers = this.#shared.events.change;
          if (changeHandlers) {
            const prev = this.#shared.prev;
            this.#shared.prev = null;
            for (let i = 0, len = changeHandlers.length; i < len; i++) changeHandlers[i](prev, this.value);
          }
        }
      };
      for (let i = 0, len = actionsNames.length; i < len; i++) {
        const actionName = actionsNames[i];
        if (["valueOf", "toString", "setValue", "proxy", "on", "change"].includes(actionName))
          throw new Error(`Invalid action name "${actionName}".`);
        const action = actions[actionName];
        this[actionName] = ((...args) => {
          if (this.#shared.events.change) this.#shared.prev = clone(this.#shared.value, true);
          emit(actionName, "pending");
          const controller = new AbortController();
          const promise = new Promise((resolve) => {
            controller.signal.onabort = () => {
              emit(actionName, "rejected");
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
                    emit(actionName, "completed");
                  })
                  .catch(() => {
                    emit(actionName, "rejected");
                    resolve();
                  });
              else if (!controller.signal?.aborted) {
                this.#replace(value);
                resolve();
                emit(actionName, "completed");
              }
            } catch (e) {
              emit(actionName, "rejected");
              throw e;
            }
          });
          /** @type {any} */ (promise).abort = (...args) => controller.abort(...args);
          return promise;
        }).bind(this);
      }
    }
  }

  /**
   * Subscribe to context events.
   * @param {string} event - Action name or "change".
   * @param {Function} callback - For actions: `(status, value)`. For "change": `(prev, next)`.
   * @returns {() => void} Unsubscribe function.
   */
  on(event, callback) {
    if (!this.#shared.events[event]) this.#shared.events[event] = [];
    this.#shared.events[event].push(callback);
    return () => {
      const list = this.#shared.events[event];
      if (!list) return;
      const index = list.indexOf(callback);
      if (index !== -1) list.splice(index, 1);
    };
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
          listener.get(path.join("."), Array.isArray(this));
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
              const current = object[key];
              if (
                !Array.isArray(current) ||
                current.length !== nextValue.length ||
                current.some((v, i) => v !== nextValue[i])
              ) {
                object[key] = nextValue.slice();
                this.#update([...path, key]);
              }
            } else {
              const currentValue = object[key];
              if (typeof currentValue !== "object" || currentValue === null || Array.isArray(currentValue)) object[key] = {};
              helper(object[key], nextValue, [...path, key]);
            }
          } else if (object[key] !== nextValue) {
            if (typeof object[key] === "object" && object[key] !== null) helper(object[key], null, [...path, key]);
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
        if (currentValue !== undefined) {
          object[key] = undefined;
          this.#update([...path, key]);
        }
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
        this.#shared.cache.setItem(this.#shared.key, encode(stringify(this.#shared.value), "hex"));
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
  constructor(props) {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === "undefined" && typeof descriptor.set === "undefined")
        this[functions[i]] = this[functions[i]].bind(this);
    }
    const propKeys = Object.keys(props);
    Object.defineProperty(this, "props", {
      value: (...exclude) => {
        const result = {};
        for (let i = 0, len = propKeys.length; i < len; i++) {
          const key = propKeys[i];
          if (key !== "children" && !exclude.includes(key)) result[key] = this[key];
        }
        return result;
      },
      writable: false,
      configurable: false,
      enumerable: false,
    });
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
    form;
    /**
     * @param {string} key
     * @param {"none"|"session"|"local"|"storage"} [cache]
     */
    constructor(key, cache) {
      super(
        key,
        {},
        {
          cache,
          actions: { update: (prev, path, field) => copyFieldValue(prev, path, field) },
        },
      );
    }

    /**
     * Watches one or all form fields for changes, receiving the field path and new value.
     * @param {string | ((e: Event) => void)} arg1
     * @param {(e: Event) => void} arg2
     * @return {void}
     */
    watch(arg1, arg2) {
      if (!this.form) return;
      this.form.watch(arg1, arg2);
    }

    /**
     * Removes a field watcher previously registered with `watch`.
     * @param {string | ((e: Event) => void)} arg1
     * @param {(e: Event) => void} arg2
     * @return {void}
     */
    unwatch(arg1, arg2) {
      if (!this.form) return;
      this.form.unwatch(arg1, arg2);
    }

    /**
     * Returns an object containing only the fields whose current value differs from their default value.
     * Returns `null` if no fields have changed.
     * @param {string} [path] - Optional dot-separated path pattern (supports `*` wildcard) to filter fields.
     * @returns {Object|null}
     */
    changed(path) {
      if (!this.form) return;
      return this.form.changed(path);
    }

    /**
     * Sets the default value of one or all form fields to their current value.
     * @param {string} [path="*"]
     * @returns {void}
     */
    snapshot(path) {
      if (!this.form) return;
      this.form.snapshot(path);
    }

    /**
     * Resets the value of a form field to its initial state.
     * @param {string} [path="*"]
     * @returns {void}
     */
    reset(path) {
      if (!this.form) return;
      this.form.reset(path);
    }

    /**
     * Clears the value of a form field.
     * @param {string} [path="*"]
     * @returns {void}
     */
    clear(path) {
      if (!this.form) return;
      this.form.clear(path);
    }

    /**
     * Validates one field or the full form.
     * @param {string} [path="*"]
     * @returns {null|Array<{ field: any, error: string }>}
     */
    validate(path) {
      if (!this.form) return;
      return this.form.validate(path);
    }

    /**
     * Submits the form programmatically.
     * @returns {void}
     */
    submit() {
      if (!this.form) return;
      this.form.submit();
    }

    /**
     * Returns an object with the current values of all form fields.
     * @returns {Record<string, any>}
     */
    values() {
      if (!this.form) return {};
      return this.form.values();
    }

    /**
     * Returns a specific form field.
     * @param {string} name
     * @returns {{
     *  value: any,
     *  clear: () => void,
     *  reset: () => void,
     *  validate: () => null|string,
     * } | null}
     */
    field(name) {
      if (!this.form) return;
      return this.form.field(name);
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
          if (this.context) this.context.form = element;
          Object.assign(element, {
            watch: (arg1, arg2) => this.watch(arg1, arg2),
            unwatch: (arg1, arg2) => this.unwatch(arg1, arg2),
            changed: (name) => this.changed(name),
            snapshot: (name) => this.snapshot(name),
            reset: (name) => this.reset(name),
            clear: (name) => this.clear(name),
            submit: () => this.submit(),
            values: () => this.values(),
            field: (name) => this.field(name),
            validate: (name) => this.validate(name),
          });
        }),
        onreset: () => this.reset(),
        onsubmit: (event) => {
          event.preventDefault();
          if (this.validate()) return;
          event.values = this.values();
          if (typeof this.onsubmit === "function") this.onsubmit?.(event);
          else if (typeof this.onSubmit === "function") this.onSubmit?.(event);
        },
        ...spreadProps(() => this.props("ref", "onsubmit", "onreset")),
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
      attributes.role === "part" ||
      (type !== "input" &&
        type !== "textarea" &&
        type !== "select" &&
        attributes.role !== "input" &&
        attributes.role !== "select") ||
      attributes.type === "submit"
    )
      return;
    const path = attributes.name || attributes.id;
    if (!path) {
      if ("production" !== process.env.NODE_ENV)
        console.warn(`Missing either "id" or "name" attribute on ${type} inside of form.`);
      return;
    }
    const isNew = !this.#fields[path];
    const field = isNew ? {} : this.#fields[path];
    if (isNew) {
      this.#fields[path] = field;
      field.type = node.type || attributes.role;
      field.node = field.type === "radio" ? [node] : node;
      field.value = getFieldValue(field);
      field.defaultValue = field.value;
    } else if (type === "radio") field.node.push(node);
    else field.node = node;
    field.required = attributes.required === true || attributes.required === "true";
    field.validator = attributes.validator instanceof Mutation ? attributes.validator() : attributes.validator;
    if (isNew) this.context?.update?.(path, field);
    else updateFieldNodeValue(field, field.value);
    node.addEventListener(field.type === "select" ? "change" : "input", (e) => {
      if (!this.#invalidEvent) node.setCustomValidity?.("");
      field.value = getFieldValue(field);
      this.context?.update?.(path, field);
      for (let i = 0, len = this.#listeners[path]?.length; i < len; i++) this.#listeners[path][i](e);
      for (let i = 0, len = this.#listeners["*"]?.length; i < len; i++) this.#listeners["*"][i](e);
    });
  }

  /**
   * Watches one or all form fields for changes, receiving the field path and new value.
   * @param {string | ((e: Event) => void)} arg1
   * @param {(e: Event) => void} arg2
   * @return {void}
   */
  watch(arg1, arg2) {
    if (!arg1 || this.#parent) return;
    if (typeof arg1 === "function") {
      arg2 = arg1;
      arg1 = "*";
    } else if (typeof arg2 !== "function") return;
    if (!this.#listeners[arg1]) {
      this.#listeners[arg1] = [arg2];
      return;
    }
    for (let i = 0, len = this.#listeners[arg1]?.length; i < len; i++) {
      if (this.#listeners[arg1][i] === arg2) return;
    }
    this.#listeners[arg1].push(arg2);
  }

  /**
   * Removes a field watcher previously registered with `watch`.
   * @param {string | ((e: Event) => void)} arg1
   * @param {(e: Event) => void} arg2
   * @return {void}
   */
  unwatch(arg1, arg2) {
    if (!arg1 || this.#parent) return;
    if (typeof arg1 === "function") {
      arg2 = arg1;
      arg1 = "*";
    } else if (typeof arg2 !== "function") return;
    for (let i = 0, len = this.#listeners[arg1]?.length; i < len; i++) {
      if (this.#listeners[arg1][i] === arg2) {
        this.#listeners[arg1].splice(i, 1);
        return;
      }
    }
  }

  /**
   * Returns an object containing only the fields whose current value differs from their default value.
   * Returns `null` if no fields have changed.
   * @param {string} [path] - Optional dot-separated path pattern (supports `*` wildcard) to filter fields.
   * @returns {boolean}
   */
  changed(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        if (this.field(inputs[i]).changed()) return true;
      }
      return false;
    }
    return this.field(path)?.changed();
  }

  /**
   * Sets the default value of one or all form fields to their current value.
   * @param {string} [path="*"]
   * @returns {void}
   */
  snapshot(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).snapshot();
      }
    } else this.field(path)?.snapshot();
  }

  /**
   * Resets the value of a form field to its initial state.
   * @param {string} [path="*"]
   * @returns {void}
   */
  reset(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).reset();
      }
    } else this.field(path)?.reset();
  }

  /**
   * Clears one field or all fields.
   * @param {string} [path="*"]
   */
  clear(path = "*") {
    if (path === "*" || path.endsWith(".*")) {
      const inputs = Object.keys(this.#fields);
      path = path === "*" ? "" : path.slice(0, -2) + ".";
      for (let i = 0, len = inputs.length; i < len; i++) {
        if (path && !inputs[i].startsWith(path)) continue;
        this.field(inputs[i]).clear();
      }
    } else this.field(path)?.clear();
  }

  /**
   * Validates one, all or a set of fields from the form.
   * @param {string} [path = "*"]
   * @returns {null|Array<{ field: any, error: string }>}
   */
  validate(path = "*") {
    if (path && !this.#fields[path]) return null;
    let errors = [];
    const inputs = path === "*" || path.endsWith(".*") ? Object.keys(this.#fields) : [path];
    path = !path.endsWith(".*") ? "" : path.slice(0, -2) + ".";
    for (let i = 0, len = inputs.length; i < len; i++) {
      if (path && !inputs[i].startsWith(path)) continue;
      const field = this.field(inputs[i]);
      const error = field.validate();
      if (error) errors.push({ field, error });
    }
    if (!this.#invalidEvent && this.#node?.reportValidity) return this.#node.reportValidity();
    if (errors.length === 0) return null;
    const invalidEvent = new Event("invalid");
    /** @type {any} */ (invalidEvent).errors = errors;
    this.#node.dispatchEvent(invalidEvent);
    return errors;
  }

  /**
   * Submits the form programmatically.
   * @returns {void}
   */
  submit() {
    this.#node.requestSubmit();
  }

  /**
   * Returns an object with the current values of all form fields.
   * @returns {Record<string, any>}
   */
  values() {
    const values = {};
    const inputs = Object.keys(this.#fields);
    for (let i = 0, len = inputs.length; i < len; i++) copyFieldValue(values, inputs[i], this.#fields[inputs[i]]);
    return values;
  }

  /**
   * Returns a specific form field.
   * @param {string} name
   * @returns {{
   *  value: any,
   *  changed: () => boolean,
   *  snapshot: () => void,
   *  reset: () => void,
   *  clear: () => void,
   *  validate: () => null|string,
   * } | null}
   */
  field(name) {
    const field = this.#fields[name];
    if (!field) return undefined;
    const invalid = () => !!this.#invalidEvent;
    return {
      get value() {
        return field.value;
      },
      set value(value) {
        if (field.value === value) return;
        updateFieldNodeValue(field, value, true);
      },
      changed() {
        return !equals(field.value, field.defaultValue);
      },
      snapshot() {
        field.defaultValue = field.value;
      },
      reset() {
        if (field.value === field.defaultValue) return;
        updateFieldNodeValue(field, field.defaultValue, true);
        if (!invalid()) setFieldValidity(field, "");
      },
      clear() {
        if (field.value === undefined) return;
        updateFieldNodeValue(field, undefined, true);
      },
      validate() {
        const value = getFieldValue(field);
        if (field.required === true && !value) {
          if (!invalid()) setFieldValidity(field, Form.DEFAULT_ERROR_MESSAGE);
          return Form.DEFAULT_ERROR_MESSAGE;
        }
        const error = typeof field.validator === "function" ? field.validator(value) : null;
        if (typeof error === "string") {
          if (!invalid()) setFieldValidity(field, error);
          return error;
        } else if (error === false) {
          if (!invalid()) setFieldValidity(field, Form.DEFAULT_ERROR_MESSAGE);
          return Form.DEFAULT_ERROR_MESSAGE;
        } else if (!invalid()) setFieldValidity(field, "");
        return null;
      },
    };
  }
}

/**
 * @typedef {JSX.EventHandlers & {
 *   id?: string,
 *   ref?: Ref<HTMLElement> | ((element: HTMLElement) => void),
 *   type?: "scroll" | "lazy",
 *   style?: JSX.Style,
 *   rowCount?: number,
 *   rows?: ((index: number) => JSX.Element) | JSX.Element[],
 *   rowHeight?: number,
 *   overscan?: number,
 * }} VirtualContainerProps
 */

/**
 * A virtual container that supports two modes:
 * - **Virtual scroll**: when `rows` and `rowHeight` are provided, renders only the visible rows.
 * - **Lazy render**: when only children are provided, renders them only when the container is visible in the viewport.
 * @extends {Component<VirtualContainerProps>}
 */
export class VirtualContainer extends Component {
  visible;
  #container = new Ref();
  #inner = new Ref();
  #observer;
  #start = 0;
  #end = 0;
  #prevRows;
  #prevRowCount;

  onConnect() {
    const container = this.#container.node;
    if (!container) return;
    if (this.type === "scroll") {
      this.#update();
      this.#observer = new ResizeObserver(() => this.#update());
      container.style.setProperty("overflow", "auto", "important");
    } else
      this.#observer = new IntersectionObserver(([entry]) => (this.visible = entry.isIntersecting), {
        rootMargin: "100px",
      });
    this.#observer.observe(container);
  }

  onDisconnect() {
    this.#observer?.disconnect();
  }

  #update() {
    const container = this.#container.node;
    if (!container) return;
    const rows = this.rows;
    const count = Array.isArray(rows) ? rows.length : this.rowCount;
    const rowsChanged = rows !== this.#prevRows || count !== this.#prevRowCount;
    this.#prevRows = rows;
    this.#prevRowCount = count;
    const start = Math.max(0, ((container.scrollTop / this.rowHeight) | 0) - (this.overscan || 10));
    const end = Math.min(
      count,
      (((container.scrollTop + container.clientHeight) / this.rowHeight) | 0) + 1 + (this.overscan || 10),
    );
    if (!rowsChanged && start === this.#start && end === this.#end) return;
    this.#start = start;
    this.#end = end;
    const inner = this.#inner.node;
    if (inner) {
      inner.style.setProperty("height", `${count * this.rowHeight}px`, "important");
      inner.style.setProperty("box-sizing", "border-box", "important");
      inner.style.setProperty("padding", `${start * this.rowHeight}px 0 ${(count - end) * this.rowHeight}px`, "important");
    }
    const visible = [];
    if (typeof rows === "function") {
      for (let i = start; i < end; i++) visible.push(rows(i));
    } else if (Array.isArray(rows)) {
      for (let i = start; i < end; i++) visible.push(rows[i]);
    }
    this.visible = visible;
  }

  render() {
    if (this.type === "scroll")
      return new Element(
        "div",
        {
          ref: Ref.forward(this.ref, this.#container),
          ...spreadProps(() => this.props("visible", "ref", "type", "rows", "rowHeight", "rowCount", "overscan")),
          onScroll: () => this.#update(),
        },
        new Element(
          "div",
          {
            ref: this.#inner,
          },
          new Mutation(() => {
            this.rows; // track rows prop for reactivity
            this.rowCount; // track rowCount prop for reactivity
            this.#update();
            return this.visible;
          }),
        ),
      );

    return new Element(
      "div",
      {
        ref: Ref.forward(this.ref, this.#container),
        ...spreadProps(() => this.props("visible", "ref", "type", "rows", "rowHeight", "rowCount", "overscan")),
      },
      new Mutation(() => this.visible && this.children),
    );
  }
}

// Global

defineReadonly(window, "Fragment", Fragment);
defineReadonly(window, "prop", (caller) => new Mutation(caller));
defineReadonly(window, "child", (caller) => new Mutation(caller));
defineReadonly(window, "spread", spreadProps);
defineReadonly(window, "element", (type, props, ...children) => new Element(type, props, ...children));

//

export function spreadProps(caller) {
  const previous = Mutation.current;
  Mutation.current = null;
  let obj;
  try {
    obj = caller();
  } finally {
    Mutation.current = previous;
  }
  const result = {};
  const keys = Object.keys(obj);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    result[key] = new Mutation(() => caller()[key]);
  }
  return result;
}

function cloneProps(props) {
  const clone = (value) => {
    if (typeof value === "object") {
      if (value === null || value instanceof Element) return value;
      if (Array.isArray(value)) {
        const cloned = [];
        for (let i = 0, len = value.length; i < len; i++) cloned[i] = clone(value[i]);
        return cloned;
      } else {
        const cloned = {};
        const keys = Object.keys(value);
        for (let i = 0, len = keys.length; i < len; i++) cloned[keys[i]] = clone(value[keys[i]]);
        return cloned;
      }
    } else return value;
  };
  return clone(props);
}

function copyFieldValue(obj, path, field) {
  if (path.includes(".")) {
    let cur = obj;
    const paths = path.split(".");
    for (let n = 0, pathsLen = paths.length; n < pathsLen; n++) {
      const key = paths[n];
      if (n === pathsLen - 1) cur[key] = getFieldValue(field);
      else {
        if (!cur[key]) cur[key] = {};
        cur = cur[key];
      }
    }
  } else obj[path] = getFieldValue(field);
  return obj;
}

// @ts-ignore
function getFieldValue({ node } = {}) {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) {
      if (node[i].checked) return node[i].value;
    }
    return null;
  }
  if (node.type === "file") return node.files;
  if (node.type === "checkbox") return node.checked;
  if (node.type === "number" || node.type === "range") return node.value === "" ? null : node.valueAsNumber;
  return node.value;
}

// @ts-ignore
function updateFieldNodeValue({ node, type } = {}, value, dispatch) {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) {
      if (node[i].value == value) node[i].checked = true;
      else node[i].checked = false;
      if (dispatch) node[i].dispatchEvent(new Event(type === "select" ? "change" : "input"));
    }
    return;
  }
  if (node.type === "file") {
    if (value instanceof FileList) node.files = value;
  } else if (node.type === "checkbox") node.checked = !!value;
  else node.value = value;
  if (dispatch) node.dispatchEvent(new Event(type === "select" ? "change" : "input"));
}

// @ts-ignore
function setFieldValidity({ node } = {}, message) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (let i = 0, len = node.length; i < len; i++) node[i].setCustomValidity?.(message);
  } else node.setCustomValidity?.(message);
}
