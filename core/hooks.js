// Ref

export class Ref {
  current;
  #listeners = [];
  #value;

  constructor(initialValue) {
    this.current = initialValue;
  }

  register(value) {
    this.#value = value;
    if (value && value.nodeType !== Node.ELEMENT_NODE) return;
    watch(value, ({ type }) => {
      this.current = type === "added" ? value : null;
      for (let i = 0, len = this.#listeners.length; i < len; i++) this.#listeners[i]();
    });
  }

  subscribe(callback) {
    this.#listeners.push(callback);
  }
}

export function useRef(initialValue) {
  return new Ref(initialValue);
}

// State

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
    setTimeout(() => {
      for (let i = 0, len = this.#listeners.length; i < len; i++) this.#listeners[i]();
    }, 0);
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

// Effect

export function useEffect(callback, dependencies = [], runOnRender = true) {
  class Effect extends State {
    #value;
    #listeners = [];

    constructor() {
      super();
      if (!Array.isArray(dependencies)) return this;
      if (runOnRender) this.#value = callback();
      for (let i = 0, len = dependencies.length; i < len; i++) {
        const dep = dependencies[i];
        if (dep instanceof State)
          dep.subscribe(() => {
            this.#value = callback();
            for (let l = 0, llen = this.#listeners.length; l < llen; l++) this.#listeners[l]();
          });
        else if (dep instanceof Ref)
          dep.subscribe(() => {
            callback();
            for (let l = 0, llen = this.#listeners.length; l < llen; l++) this.#listeners[l]();
          });
      }
    }

    get value() {
      return this.#value;
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
  return new Effect();
}

//

const watch = (() => {
  if (typeof window === "undefined") return null;
  const listeners = {};
  new MutationObserver((mutations) =>
    mutations.forEach(({ type, addedNodes, removedNodes }) => {
      if (type !== "childList") return;
      addedNodes.forEach((node) => listeners?.[node]?.({ type: "added" }));
      removedNodes.forEach((node) => listeners?.[node]?.({ type: "removed" }));
    })
  ).observe(document.body, { childList: true });
  return (target, callback) => (listeners[target] = callback);
})();
