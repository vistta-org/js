import { FunctionClass } from "../../utils/index.js";

let anchorCounter = 0;

/**
 * @typedef {"bottom" | "top" | "left" | "right"} AnchorPlacement
 *
 * @typedef {object} AnchorPositionOptions
 * @property {number | string} [gap=0] Space between the anchor and the positioned element.
 * @property {string | string[] | false} [fallback]
 *   Fallback value(s) for `position-try-fallbacks` (e.g. `"flip-block"`, `"flip-inline"`,
 *   `"flip-start"`, or a custom `@position-try --name`). Defaults to `"flip-block flip-inline"` .
 *   Pass `false` to disable.
 * @property {boolean} [minSize=true] Match the anchor's width (block axis) or height (inline axis).
 */

/**
 * Function-like helper over native CSS Anchor Positioning.
 * Tracking the element sets `anchor-name` on it automatically.
 *
 * @example
 * const anchor = new Anchor();
 * anchor(buttonEl);                          // sets anchor-name: --anchor-0
 * panel.style.top = anchor.bottom;           // "anchor(--anchor-0 bottom)"
 * panel.style.minWidth = anchor.width;       // "anchor-size(--anchor-0 width)"
 * Object.assign(panel.style, anchor("bottom", { gap: "2rem" }));
 *
 * @extends {FunctionClass}
 */
export class Anchor extends FunctionClass {
  /**
   * Build a CSS anchor-positioned style object for the given placement.
   *
   * @param {Anchor | string} anchor Anchor instance or anchor name (dashed-ident, e.g. `--anchor-0`).
   * @param {AnchorPlacement} target
   * @param {AnchorPositionOptions} [options]
   * @returns {Record<string, string>}
   */
  static to(anchor, target, options = {}) {
    const name = typeof anchor === "string" ? anchor : anchor.name;
    const { gap = 0, fallback, minSize = true } = options;
    const g = typeof gap === "number" ? `${gap}px` : gap;
    const vertical = target === "bottom" || target === "top";
    const style = {
      position: "fixed",
      positionAnchor: name,
      margin: "0",
      inset: "auto",
      positionArea: `${target} span-all`,
    };
    if (vertical) {
      style[target === "bottom" ? "marginTop" : "marginBottom"] = g;
      if (minSize) style.minWidth = `anchor-size(width)`;
      style.justifySelf = "anchor-center";
      style.positionTryOrder = "most-height";
    } else {
      style[target === "left" ? "marginRight" : "marginLeft"] = g;
      if (minSize) style.minHeight = `anchor-size(height)`;
      style.alignSelf = "anchor-center";
      style.positionTryOrder = "most-width";
    }
    if (fallback !== false) {
      style.positionTryFallbacks = Array.isArray(fallback)
        ? fallback.join(", ")
        : typeof fallback === "string"
          ? fallback
          : "flip-block, flip-inline, flip-block flip-inline";
    }
    return style;
  }

  /** @type {HTMLElement | undefined} */
  #node;
  #id;

  get node() {
    return this.#node;
  }

  set node(value) {
    if (this.#node === value) return;
    if (this.#node) this.#node.style.anchorName = "";
    this.#node = value;
    if (value) this.#init(value);
  }

  #init(node) {
    if (typeof window === "undefined" || window.platform === "server" || typeof node !== "object") return;
    this.#node = node;
    node.style.setProperty("anchor-name", this.name);
  }

  constructor(node) {
    super((target, options) => {
      if (typeof target !== "string") return this.#init(target);
      switch (target) {
        case "bottom":
        case "top":
        case "left":
        case "right":
          return Anchor.to(this, target, options);
        default:
          console.warn(`Invalid anchor target: ${target}`);
          return;
      }
    });
    this.#id = anchorCounter++;
    Object.defineProperty(this, "name", {
      value: `--anchor-${this.#id}`,
      writable: false,
      configurable: false,
      enumerable: false,
    });
    this.#init(node);
  }

  get x() {
    return `anchor(${this.name} left)`;
  }

  get y() {
    return `anchor(${this.name} top)`;
  }

  get top() {
    return `anchor(${this.name} top)`;
  }

  get bottom() {
    return `anchor(${this.name} bottom)`;
  }

  get left() {
    return `anchor(${this.name} left)`;
  }

  get right() {
    return `anchor(${this.name} right)`;
  }

  get width() {
    return `anchor-size(${this.name} width)`;
  }

  get height() {
    return `anchor-size(${this.name} height)`;
  }
}

export default Anchor;
