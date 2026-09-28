const ComponentNode = Symbol("Component");

/**
 * @template [Props=Record<string, any>]
 */
export class Component {
  children = [];

  /** Symbol used by the renderer to identify component elements. */
  static get Node() {
    return ComponentNode;
  }

  /**
   * @param {Props} [props]
   */
  constructor(props) {
    const prototype = Object.getPrototypeOf(this);
    const functions = Object.getOwnPropertyNames(prototype);
    for (let i = 0, len = functions.length; i < len; i++) {
      if (functions[i] === "constructor") continue;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, functions[i]);
      if (typeof descriptor.get === "undefined" && typeof descriptor.set === "undefined")
        this[functions[i]] = this[functions[i]].bind(this);
    }
    const propKeys = Object.keys(props);
    Object.defineProperty(this, "props", {
      value: (...exclude) => {
        const result = {};
        for (let i = 0, len = propKeys.length; i < len; i++) {
          const key = propKeys[i];
          if (key !== "children" && !exclude.includes(key)) result[key] = this[key];
        }
        return result;
      },
      writable: false,
      configurable: false,
      enumerable: false,
    });
  }

  /**
   * Renders the component.
   * @returns {JSX.Element | null} The rendered output of the component.
   */
  render() {
    return null;
  }
}
