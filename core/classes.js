/* eslint-disable no-undef */
export const INTERNAL = {}

const node = Symbol("Component");

export class Ref {
  constructor(initialValue) {
    this.current = initialValue;
  }
}

export class Component {
  children = [];
  static get Node() {
    return node;
  }

  constructor() {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === 'undefined' && typeof descriptor.set === 'undefined')
        this[functions[i]] = this[functions[i]].bind(this);
    }
  }
}

export class Suspense extends Component {
  #count = 0;
  #callback;
  fallback;

  wait() {
    this.#count++;
  }

  resolve(callback) {
    if (!callback) {
      this.#count--;
      if (this.#count == 0) this.#callback();
    }
    else {
      if (this.#count == 0) callback();
      else this.#callback = callback;
    }
  }
}

export class Profiler extends Component {
  callback;

  render() {
    if (!this.callback || process.env.IS_NODE || "production" === process.env.NODE_ENV) return this.children;
    let start = performance.now();
    const callback = this.callback;
    return createElement(Fragment, null, ...this.children, createElement(class extends Component {
      onconnect() {
        callback(performance.now() - start);
      }

      render() {
        return null;
      }
    }));
  }
}

export const Render = {
  If: class extends Component {
    condition;

    render() {
      return this.condition && this.children;
    }
  },
  Each: class extends Component {
    target;
    callback;

    render() {
      if (typeof this.target !== "object") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each in needs to be either an object or an array");
        return null;
      }
      if (typeof this.callback !== "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render.Each callback needs to be a function");
        return null;
      }
      let result = [];
      if (!Array.isArray(this.target)) {
        const keys = Object.keys(this.target);
        for (let i = 0, len = keys.length; i < len; i++) result.push(this.callback(this.target[keys[i]], keys[i]));
      }
      else for (let i = 0, len = this.target.length; i < len; i++) result.push(this.callback(this.target[i], i));
      return result;
    }
  }
}

export class Try extends Component {
  fallback;

  render() {
    try {
      return this.children;
    } catch {
      return this.fallback;
    }
  }
}