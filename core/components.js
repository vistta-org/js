/* eslint-disable no-undef */
import { INTERNAL, State } from "./tools";
import { BaseFunction } from "../utils";

export class Component extends BaseFunction {
  constructor(props) {
    super(() => this.render());
    if (props && typeof props === "object") {
      const keys = Object.keys(props);
      for (let i = 0, len = keys.length; i < len; i++) this[keys[i]] = props[keys[i]];
    }
  }
}

export class Profiler extends Component {
  #idle;
  #debounce;
  #total = 0;
  constructor({ id, children, idle, callback }) {
    super({ id, children, callback });
    this.#idle = idle || 250;
  }

  record(callback) {
    if (callback) {
      return () => {
        let initial = performance.now();
        callback(() => {
          this.#total = performance.now() - initial;
          clearTimeout(this.#debounce);
          this.#debounce = setTimeout(() => {
            const total = this.#total;
            this.#total = 0;
            this.callback({ id: this.id, performance: total });
          }, this.#idle);
        });
      }
    }
    let initial = null;
    return [
      () => (initial = performance.now(), null),
      () => (this.callback({ id: this.id, performance: performance.now() - (initial || 0) }), null)
    ];
  }

  render() {
    if (!this.callback || process.env.IS_NODE || "production" === process.env.NODE_ENV) return createElement(Fragment, null, ...this.children);
    if (INTERNAL.CONTEXT.profiler) {
      console.warn("Cannot use Profiler inside another Profiler");
      return createElement(Fragment, null, ...this.children);
    }
    INTERNAL.CONTEXT.profiler = this;
    const [start, end] = this.record();
    return createElement(Fragment, null, createElement(start), ...this.children, createElement(end));
  }
}

export class Render extends Component {
  constructor({ if: _if, each: _each, children }) {
    super({ if: _if, each: _each, children });
  }

  render() {
    if (this.if != null && this.each != null) {
      if ("production" !== process.env.NODE_ENV) console.warn("Cannot use Render with both if and each.");
      return null;
    }
    if (this.if != null) return this.if instanceof State ? this.if((v) => v && this.children) : this.if && this.children;
    this.children = this.children?.[0];
    const render = (target) => {
      if (typeof target !== "object") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render each needs to be either an object or an array");
        return null;
      }
      if (typeof this.children !== "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Render each needs one children of type function");
        return null;
      }
      let result = [];
      if (!Array.isArray(target)) {
        const keys = Object.keys(target);
        for (let i = 0, len = keys.length; i < len; i++) result.push(this.children([keys[i], target[keys[i]]], i, target));
      }
      else for (let i = 0, len = target.length; i < len; i++) result.push(this.children(target[i], i, target));
      return result;
    }
    if (this.each instanceof State) return this.each((v) => render(v));
    return createElement(Fragment, null, ...render(this.each));
  }
}

export class Scope extends Component {
  constructor({ styles, children }) {
    super({ styles, children });
  }

  render() {
    return createElement(Fragment, { scope: this.styles?.reduce((acc, { scope }) => acc + " " + scope, "")?.trim() }, ...this.children);
  }
}

export class Suspense extends Component {
  #count = 0;
  #callback;

  constructor({ children, fallback }) {
    super({ children, fallback });
  }

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

  render() {
    return this.children;
  }
}

export class Try extends Component {
  constructor({ children, fallback }) {
    super({ children, fallback });
  }

  render() {
    try {
      return this.children;
    } catch {
      return this.fallback;
    }
  }
}