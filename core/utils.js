import { clone } from "@vistta/utils";
import { FunctionClass } from "../utils/index.js";
import { Context } from "./classes.js";
export { Style } from "./stylesheet.js";

export class File {
  /**
   * Download a file
   *
   * @param {string} filename
   * @param {*} content
   * @param {string} [type]
   */
  static download(filename, content, type = "text/plain") {
    const element = document.createElement("a");
    const file = new Blob([content], { type });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    URL.revokeObjectURL(element.href);
  }

  /**
   * Upload a file
   * @template {boolean | undefined} T
   * @param {{ multiple?: T, accept?: string }} [options]
   *
   * @returns {Promise<T extends true ? FileList : File | null>}
   */
  static upload(options = {}) {
    const element = document.createElement("input");
    element.type = "file";
    element.accept = options?.accept || "";
    element.multiple = options?.multiple || false;
    element.style.display = "none";
    document.body.appendChild(element);
    return new Promise((resolve) => {
      element.addEventListener("change", () => {
        const result = options?.multiple ? element.files : element.files[0];
        resolve(/** @type {any} */ (result));
        document.body.removeChild(element);
      });
      element.click();
    });
  }

  /**
   * Read a file as text
   *
   * @param {Blob} file
   * @param {Object} [options]
   * @param {"text" | "arraybuffer" | "data"} [options.type='text']
   * @returns {Promise<any>}
   */
  static read(file, type = "text") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      if (type === "text") reader.readAsText(file);
      else if (type === "arraybuffer") reader.readAsArrayBuffer(file);
      else if (type === "data") reader.readAsDataURL(file);
      else reject(new Error("Invalid file read type"));
    });
  }
}

export class ThemeContext extends Context {
  constructor() {
    super(
      "theme",
      { value: "auto" },
      {
        cache: "storage",
        actions: {
          toggle: (prev) => {
            switch (prev.value) {
              case "light":
                document.documentElement.setAttribute("theme", "dark");
                return { value: "dark" };
              case "dark":
                document.documentElement.removeAttribute("theme");
                return { value: "auto" };
              default:
                document.documentElement.setAttribute("theme", "light");
                return { value: "light" };
            }
          },
          set: (_, value) => {
            document.documentElement.setAttribute("theme", value);
            return { value };
          },
        },
      },
    );
    document.documentElement.setAttribute("theme", this.value?.value);
  }
}

export class HistoryContext extends Context {
  constructor(name, initial, { cache, actions } = /** @type {any} */ ({})) {
    super(name, initial, {
      cache,
      actions: {
        ...actions,
        set: (_, state) => state,
        update: (prev, state) => {
          state = clone({ ...prev, ...state }, true);
          history.pushState(state, document.title, location.href);
          return state;
        },
      },
    });
    window.addEventListener("popstate", ({ state: _state }) => /** @type {any} */ (this).set(_state));
    // Timeout needed to wait for initial history and cache load
    if (typeof history !== "undefined")
      setTimeout(() => history.replaceState(JSON.parse(super.toString()), document.title, location.href), 250);
  }
}

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
