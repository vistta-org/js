export class State {
  #value;
  #listeners = new Set();

  constructor(initialValue) {
    this.#value = initialValue;
  }

  get value() {
    return this.#value;
  }

  set value(x) {
    this.#value = x;
    this.#listeners.forEach((l) => l());
  }

  compute(callback) {
    class Computed extends State {
      constructor(value, subscribe) {
        super();
        this.#value = value;
        this.subscribe = subscribe;
      }

      get value() {
        return this.#value();
      }

      set value(x) {}
    }
    return new Computed(() => callback(this.#value), (cb) => this.subscribe(cb));
  }

  valueOf() {
    return this.value;
  }

  toString() {
    if(this.value == null || typeof this.value === "object") return "";
    return `${this.value}`;
  }

  subscribe(callback) {
    this.#listeners.add(callback);
  }
}

export function useState(initialValue) {
  return new State(initialValue);
}

//