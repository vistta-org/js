import { FunctionClass } from "../utils/index.js";

/**
 * The mutation currently capturing reactive reads. Set by the renderer while
 * evaluating a mutation's callback so that property getters can link the
 * mutation to the sets they read from.
 * @type {Mutation|null}
 */
export class Mutation extends FunctionClass {
  static current = null;

  /**
   * Wraps a callback so it can be lazily resolved when read as a prop.
   * @param {Function} callback
   */
  constructor(callback) {
    super(callback);
    this.callback = callback;
    /** @type {Set<Set<Mutation>>|undefined} */
    this.tracked = undefined;
    /** @type {boolean|undefined} */
    this.disabled = undefined;
    /** @type {() => void|undefined} */
    this.update = undefined;
  }
}
