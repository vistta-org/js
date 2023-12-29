import { State, HOOKS_ERROR } from "./hooks";
import { INTERNAL } from "./context";
import { encode, decode, stringify, parse, isPromise, ExtensibleFunction } from "../utils";

const STORAGE_KEY = "Vistta_Store_";

class Store extends ExtensibleFunction {
  #partitions = {};

  static createPartition(config) {
    return new Partition(this, config);
  }

  static createAction(name, action, on) {
    return (action.fnName = name), (action.on = on), action;
  }

  constructor(partitions = []) {
    super((...args) => this.use(...args));
    for (let i = 0, len = partitions.length; i < len; i++) {
      const partition = partitions[i];
      if (!(partition instanceof Partition)) continue;
      this.#partitions[partition.key] = partition;
    }
  }

  use(...partitions) {
    if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR) || !partitions?.length) return null;
    if (partitions.length == 1) return this.#partitions?.[partitions[0]];
    else return partitions.map((partition) => this.#partitions?.[partition]);
  }
}

class Partition extends State {
  #key;

  constructor(store, { key, initialState, cache = "session", actions }) {
    if (!key) return null;
    super((cache !== "none" ? getCacheValue(key) : undefined) || initialState);
    this.store = store;
    this.#key = key;
    for (let i = 0, len = actions.length; i < len; i++) {
      const action = actions[i];
      this[action.fnName] = ((...args) => {
        action.on?.call(this, "pending", super.valueOf());
        const controller = new AbortController();
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise(async (resolve) => {
          controller.signal.onabort = () => {
            action.on?.call(this, "rejected", controller.signal.reason);
            resolve(null);
          };
          try {
            let value = action(super.valueOf(), ...args);
            if (isPromise(value)) value = await value;
            if (!controller.signal?.aborted) {
              action.on?.call(this, "completed", super.valueOf());
              if (value !== undefined && super.valueOf() !== value) {
                super.set(value);
                if (cache !== "none") updateCache(key, super.valueOf(), cache);
                resolve(super.valueOf());
              }
            }
          } catch (e) {
            action.on?.call(this, "rejected", e);
            resolve(null);
          }
        });
        promise.abort = (...args) => controller.abort(...args);
        return promise;
      }).bind(this);
    }
  }

  get key() {
    return this.#key;
  }

  set() {
    /* Do Nothing */
  }
}

export { Store };

//

function updateCache(key, value, type) {
  const storage = type === "session" ? sessionStorage : localStorage;
  storage.setItem(encode(STORAGE_KEY + key), encode(stringify(value)));
}

function getCacheValue(key) {
  try {
    return parse(decode(localStorage.getItem(encode(STORAGE_KEY + key)))) || undefined;
  } catch {
    return undefined;
  }
}
