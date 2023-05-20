export class State {
  #value;
  #listeners = [];

  constructor(initialValue) {
    this.#value = initialValue;
  }

  get value() {
    return this.#value;
  }

  set value(x) {
    this.#value = x;
    for (let i = 0, len = this.#listeners.length; i < len; i++) this.#listeners[i]();
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
    return new Computed(
      () => callback(this.#value),
      (cb) => this.subscribe(cb)
    );
  }

  valueOf() {
    return this.value;
  }

  toString() {
    if (this.value == null || typeof this.value === "object") return "";
    return `${this.value}`;
  }

  subscribe(callback) {
    this.#listeners.push(callback);
  }
}

export function useState(initialValue) {
  return new State(initialValue);
}
