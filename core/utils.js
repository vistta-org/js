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
    super("theme", { value: "auto" }, "storage", {
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
    });
    document.documentElement.setAttribute("theme", this.value?.value);
  }
}

export class HistoryContext extends Context {
  #listeners = [];

  constructor(name, initial, cache) {
    let prev;
    super(
      name,
      initial,
      cache,
      {
        set: (_, state) => state,
        update: (prev, state) => {
          state = clone({ ...prev, ...state }, true);
          history.pushState(state, document.title, location.href);
          return state;
        },
      },
      (_, status, value) => {
        const len = this.#listeners.length;
        if (len === 0) return;
        value = clone(value, true);
        if (status === "pending") prev = value;
        else if (status === "completed") {
          for (let i = 0; i < len; i++) this.#listeners[i](prev, value);
          prev = null;
        }
      },
    );
    window.addEventListener("popstate", ({ state: _state }) => /** @type {any} */ (this).set(_state));
    // Timeout needed to wait for initial history and cache load
    if (typeof history !== "undefined")
      setTimeout(() => history.replaceState(JSON.parse(super.toString()), document.title, location.href), 250);
  }

  onUpdate(listener) {
    this.#listeners.push(listener);
  }
}

const anchors = {
  counter: 0,
  observers: [],
  root: null,
};

function setAnchorVar(id, name, value) {
  if (!anchors.root) anchors.root = document.querySelector(":root");
  anchors.root.style.setProperty(`--anchor-${id}-${name}`, value);
}

/**
 * CSS variable names exposed by Anchor.
 * x and y are viewport-based left/top from getBoundingClientRect().
 * width and height are element size from getBoundingClientRect().
 *
 * @typedef {"x" | "y" | "top" | "bottom" | "left" | "right" | "width" | "height"} AnchorKey
 */

/**
 * Creates a function-like anchor helper that tracks an element rect and exposes
 * CSS variable references for positioning/sizing in styles.
 *
 * @example
 * const anchor = new Anchor();
 * anchor(buttonEl);               // starts observing
 * panel.style.left = anchor("x"); // "var(--anchor-0-x)"
 * panel.style.top = anchor("y");
 *
 * @extends {FunctionClass}
 */
export class Anchor extends FunctionClass {
  /** @type {Element | undefined} */
  node;
  #id;
  #last = {};

  #init(node) {
    if (window.isServer || typeof node !== "object") return;
    if (anchors.observers.length === 0) {
      const main = () => {
        for (let i = anchors.observers.length - 1; i >= 0; i--) {
          if (anchors.observers[i].read() === false) anchors.observers.splice(i, 1);
        }
        for (let i = 0, len = anchors.observers.length; i < len; i++) {
          anchors.observers[i].write();
        }
        if (anchors.observers.length > 0) requestAnimationFrame(main);
      };
      requestAnimationFrame(main);
    }
    this.node = node;
    /** @type {Partial<Record<AnchorKey, number>> | null} */
    let next = null;
    const read = () => {
      if (!this.node || !this.node?.isConnected) return false;
      const rect = this.node.getBoundingClientRect();
      const top = window.innerHeight - rect.top;
      const left = window.innerWidth - rect.left;
      next = {
        x: rect.left,
        y: rect.top,
        top,
        bottom: rect.bottom,
        left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    };
    const write = () => {
      if (!next) return;
      if (this.#last.x !== next.x) (setAnchorVar(this.#id, `x`, `${next.x}px`), (this.#last.x = next.x));
      if (this.#last.y !== next.y) (setAnchorVar(this.#id, `y`, `${next.y}px`), (this.#last.y = next.y));
      if (this.#last.top !== next.top) (setAnchorVar(this.#id, `top`, `${next.top}px`), (this.#last.top = next.top));
      if (this.#last.bottom !== next.bottom)
        (setAnchorVar(this.#id, `bottom`, `${next.bottom}px`), (this.#last.bottom = next.bottom));
      if (this.#last.left !== next.left) (setAnchorVar(this.#id, `left`, `${next.left}px`), (this.#last.left = next.left));
      if (this.#last.right !== next.right)
        (setAnchorVar(this.#id, `right`, `${next.right}px`), (this.#last.right = next.right));
      if (this.#last.width !== next.width)
        (setAnchorVar(this.#id, `width`, `${next.width}px`), (this.#last.width = next.width));
      if (this.#last.height !== next.height)
        (setAnchorVar(this.#id, `height`, `${next.height}px`), (this.#last.height = next.height));
      next = null;
    };
    requestAnimationFrame(() => {
      if (read() !== false) write();
    });
    anchors.observers.push({ read, write });
  }

  constructor(node) {
    super((target, offset) => {
      if (typeof target !== "string") return this.#init(target);
      const offsetType = typeof offset;
      switch (target) {
        case "x":
        case "y":
        case "top":
        case "bottom":
        case "left":
        case "right":
        case "width":
        case "height":
          if (offsetType === "number") return `calc(var(--anchor-${this.#id}-${target}) + ${offset}px)`;
          if (offsetType === "string") return `calc(var(--anchor-${this.#id}-${target}) + ${offset})`;
          return `var(--anchor-${this.#id}-${target})`;
        default:
          console.warn(`Invalid anchor target: ${target}`);
      }
    });
    this.#id = anchors.counter++;
    this.#init(node);
  }

  get x() {
    return `var(--anchor-${this.#id}-x)`;
  }

  get y() {
    return `var(--anchor-${this.#id}-y)`;
  }

  get top() {
    return `var(--anchor-${this.#id}-top)`;
  }

  get bottom() {
    return `var(--anchor-${this.#id}-bottom)`;
  }

  get left() {
    return `var(--anchor-${this.#id}-left)`;
  }

  get right() {
    return `var(--anchor-${this.#id}-right)`;
  }

  get width() {
    return `var(--anchor-${this.#id}-width)`;
  }

  get height() {
    return `var(--anchor-${this.#id}-height)`;
  }
}
