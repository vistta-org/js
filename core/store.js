import { State, HOOKS_ERROR } from "./hooks";
import { INTERNAL } from "./context";
import { encode, decode, stringify, parse, isPromise } from "../utils";

const STORAGE_KEY = "Vistta_Store_";
const partitions = {};

class Store {
  static createPartition(key, ...args) {
    if (!key) return null;
    partitions[key] = new Partition(key, ...args)
    return partitions[key];
  }

  static use(...names) {
    if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR) || !names?.length) return null;
    if (names.length == 1) return partitions?.[names[0]];
    else return names.map((partition) => partitions?.[partition]);
  }
}

class Partition extends State {
  #key;

  constructor(key, initialState, cache = "session", actions, controllers) {
    super((cache !== "none" ? getCacheValue(key) : undefined) || initialState);
    this.#key = key;
    const controllerFn = (target, ...args) => typeof controllers === "function" ? controllers.call(this, target, ...args) : controllers?.[target]?.call(this, ...args);
    const actionsFn = Object.keys(actions);
    for (let i = 0, len = actionsFn.length; i < len; i++) {
      const actionName = actionsFn[i];
      const action = actions[actionName];
      this[actionName] = ((...args) => {
        controllerFn(actionName, "pending", super.valueOf());
        const controller = new AbortController();
        // eslint-disable-next-line no-async-promise-executor
        const promise = new Promise(async (resolve) => {
          controller.signal.onabort = () => {
            controllerFn(actionName, "rejected", controller.signal.reason);
            resolve(null);
          };
          try {
            let value = action(super.valueOf(), ...args);
            if (isPromise(value)) value = await value;
            if (!controller.signal?.aborted) {
              if (value !== undefined && super.valueOf() !== value) {
                super.set(value);
                if (cache !== "none") updateCache(key, super.valueOf(), cache);
                resolve(super.valueOf());
                console.log(value, super.valueOf());
              }
              controllerFn(actionName, "completed", super.valueOf());
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
