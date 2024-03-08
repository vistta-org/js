import { encode, decode, stringify, parse, isPromise, FunctionClass } from "../utils";

const CONTEXT_CACHE_KEY = "Vistta_Context_";

class Context extends FunctionClass {
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
          if (["valueOf", "toString", "setValue", "__register"].includes(actionName)) throw new Error(`Invalid action name "${actionName}".`);
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

  __register(callback) {
    this.#callback = callback;
  }
}

export { Context };

//

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
