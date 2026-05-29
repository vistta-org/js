import { Component } from "../component.js";

export class Profiler extends Component {
  callback;
  #initial;
  #update = 0;

  /** Triggers the initial render duration callback after component mount. */
  onConnect() {
    this.callback((this.#initial = performance.now() - this.#initial));
  }

  /** @returns {JSX.Node|JSX.Node[]} */
  render() {
    if (!this.callback || "production" === process.env.NODE_ENV) return this.children;
    this.#initial = performance.now();
    return this.children;
  }

  /**
   * Starts a measurement section and returns a function that closes it.
   * @returns {(callback?: (profiler: Profiler) => any) => any}
   */
  record() {
    let start = performance.now();
    return (callback) => {
      this.#update += performance.now() - start;
      return callback?.(this);
    };
  }

  /**
   * Emits accumulated update time and resets internal counters.
   * @returns {Profiler}
   */
  end() {
    this.callback(this.#update);
    this.#update = 0;
    return this;
  }
}
