import route from "./router";
import { State } from "../hooks";
import { encode, decode, stringify, parse, isPromise } from "../../utils";

const STORAGE_KEY = "Vistta_Store_";

class Store {
  #partitions = {};

  static createPartition(config) {
    return new Partition(this, config);
  }

  static createAction(name, action, on) {
    return (action.fnName = name), (action.on = on), action;
  }

  constructor(partitions = []) {
    for (let i = 0, len = partitions.length; i < len; i++) {
      const partition = partitions[i];
      if (!(partition instanceof Partition)) continue;
      this.#partitions[partition.key] = partition;
    }
  }

  use(partition) {
    return this.#partitions?.[partition];
  }
}

class Partition extends State {
  #key;

  constructor(store, { key, initialState, cache = "session", actions }) {
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

function useStore(partition) {
  return route?.store?.use(partition);
}

export { Store, useStore };

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
