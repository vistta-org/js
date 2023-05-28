import route from "./router";
import { State } from "./hooks";
import { encode, decode, stringify, parse, isAsync } from "../utils";

const STORAGE_KEY = "Vistta_Store_";

class Store {
  #partitions = {};

  static createPartition(key, config) {
    return new Partition(key, config);
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

  constructor(key, { initialState, cache = "none", actions }) {
    const cacheValue = cache !== "none" ? getCacheValue(key) : undefined;
    super(cacheValue || initialState);
    this.#key = key;
    for (let i = 0, len = actions.length; i < len; i++) {
      const action = actions[i];
      // TODO: ABORT CONTROLLER
      this[action.fnName] = async (...args) => {
        action.on("pending", super.value);
        try {
          const returnedValue = isAsync(action) ? await action(super.value, ...args) : action(super.value, ...args);
          action.on("completed", super.value);
          if (returnedValue !== undefined && super.value !== returnedValue) {
            super.value = returnedValue;
            if (cache !== "none") updateCache(key, super.value, cache);
          }
        } catch {
          action.on("rejected", super.value);
        }
      };
    }
  }

  get key() {
    return this.#key;
  }

  get value() {
    return super.value;
  }

  set value(x) {
    /* do nothing */
  }
}

function useStore(partition, callback) {
  return route?.store?.use(partition, callback);
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
