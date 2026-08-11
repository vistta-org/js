import { clone, decode, encode, FunctionClass, isPromise, parse, proxy, stringify } from "../utils/index.js";

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
   * @param {boolean} [options.sync] - Whether to sync state across browser tabs via the `storage` event. Only effective when `cache` resolves to `localStorage`.
   */
  constructor(key, value, { cache, actions, encode: encodeCache, sync } = {}) {
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
    if (sync) this.#sync();
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
    if (!this.#shared.cache || this.#shared.syncing) return;
    clearTimeout(this.#shared.debounce);
    this.#shared.debounce = setTimeout(() => {
      try {
        this.#shared.cache.setItem(this.#shared.key, encode(stringify(this.#shared.value), "hex"));
      } catch (e) {
        console.error(e);
      }
    }, 100);
  }

  #sync() {
    if (this.#shared.cache !== localStorage || this.#shared.syncListener) return;
    this.#shared.syncListener = (event) => {
      if (event.key !== this.#shared.key || event.newValue == null) return;
      let incoming;
      try {
        incoming = parse(decode(event.newValue, "hex"));
      } catch {
        return;
      }
      if (typeof incoming !== "object" || incoming === null) return;
      const changeHandlers = this.#shared.events.change;
      const prev = changeHandlers ? clone(this.#shared.value, true) : null;
      this.#shared.syncing = true;
      try {
        this.#replace(incoming);
      } finally {
        this.#shared.syncing = false;
      }
      if (changeHandlers) for (let i = 0, len = changeHandlers.length; i < len; i++) changeHandlers[i](prev, this.value);
    };
    window.addEventListener("storage", this.#shared.syncListener);
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
