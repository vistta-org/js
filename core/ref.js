import { Mutation } from "./mutation.js";

/**
 * @template [Element=any]
 */
export class Ref {
  /**
   * Composes an external ref with an internal callback.
   * @template T
   * @param {any[]} args
   * @returns {(node: T) => any}
   */
  static forward(...args) {
    return (element) => {
      for (let i = 0, len = args.length; i < len; i++) Ref.assign(args[i], element);
    };
  }

  /**
   * Assigns a value to a ref, supporting both callback and object refs.
   * @template T
   * @param {any} ref
   * @param {T} value
   */
  static assign(ref, value) {
    if (typeof ref === "function") {
      const prev = Mutation.current;
      Mutation.current = null;
      ref(value);
      Mutation.current = prev;
    } else if (typeof ref == "object" && ref) ref.node = value;
  }

  /**
   * @param {Element} [initialValue] - The initial value of the reference.
   */
  constructor(initialValue) {
    this.node = initialValue;
  }
}
