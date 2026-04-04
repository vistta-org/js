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
  style: null,
};

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
  #node;
  #id;
  #last = {};

  get node() {
    return this.#node;
  }

  set node(value) {
    if (this.#node === value) return;
    this.#node = value;
    this.debug = true;
    if (value) this.#init(value);
  }

  #init(node) {
    if (window.isServer || typeof node !== "object") return;
    if (anchors.observers.length === 0) {
      anchors.style = document.head.appendChild(document.createElement("style"));
      const main = () => {
        for (let i = anchors.observers.length - 1; i >= 0; i--) {
          if (!anchors.observers[i].read()) anchors.observers.splice(i, 1);
        }
        let css = "";
        let changed = false;
        for (let i = 0, len = anchors.observers.length; i < len; i++) {
          const o = anchors.observers[i];
          const prev = o.css;
          o.css = o.write();
          css += o.css;
          if (prev !== o.css) changed = true;
        }
        if (changed) anchors.style.textContent = css ? `:root{${css}}` : "";
        if (anchors.observers.length > 0) requestAnimationFrame(main);
        else {
          anchors.style.remove();
          anchors.style = null;
        }
      };
      requestAnimationFrame(main);
    }
    this.#node = node;
    const id = this.#id;
    const last = this.#last;
    let nx, ny, ntop, nbottom, nleft, nright, nwidth, nheight;
    let dirty = false;
    const read = (init) => {
      if (!this.#node || !this.#node.isConnected) return false;
      const rect = this.#node.getBoundingClientRect();
      nx = rect.left;
      ny = rect.top;
      nwidth = rect.width;
      nheight = rect.height;
      dirty = nx !== last.x || ny !== last.y || nwidth !== last.width || nheight !== last.height;
      if (dirty || init) {
        ntop = window.innerHeight - ny;
        nbottom = rect.bottom;
        nleft = window.innerWidth - nx;
        nright = rect.right;
      }
      return true;
    };
    let vars = "";
    const write = (init) => {
      if (!dirty && !init) return vars;
      dirty = false;
      const p = `--anchor-${id}-`;
      last.x = nx;
      last.y = ny;
      last.top = ntop;
      last.bottom = nbottom;
      last.left = nleft;
      last.right = nright;
      last.width = nwidth;
      last.height = nheight;
      vars = `${p}x:${nx}px;${p}y:${ny}px;${p}top:${ntop}px;${p}bottom:${nbottom}px;${p}left:${nleft}px;${p}right:${nright}px;${p}width:${nwidth}px;${p}height:${nheight}px;`;
      return vars;
    };
    requestAnimationFrame(() => read(true) && write(true));
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
