import { clone } from "@vistta/utils";
import { Context, Ref } from "./classes.js";
export { assignStyle } from "./stylesheet.js";

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
   * @param {Object} [options]
   * @param {boolean} [options.multiple=false]
   * @param {string} [options.accept='']
   *
   * @returns {Promise<FileList>}
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
        resolve(options?.multiple ? element.files : element.files[0]);
        document.body.removeChild(element);
      });
      element.click();
    });
  }

  /**
   * Read a file as text
   *
   * @param {File} file
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
          const newState = clone({ ...prev, ...state }, true);
          history.pushState(newState, document.title, location.href);
          return newState;
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
    window.addEventListener("popstate", ({ state: _state }) => this.set(_state));
    // Timeout needed to wait for initial history and cache load
    if (typeof history !== "undefined")
      setTimeout(() => history.replaceState(JSON.parse(super.toString()), document.title, location.href), 250);
  }

  onUpdate(listener) {
    this.#listeners.push(listener);
  }
}

const eventObservers = [];
const elementObservers = {};

export function anchor(element, target) {
  target = typeof target === "string" ? document.querySelector(target) : target;
  if (target instanceof Ref) target = target.node;
  if (!target) return;
  let last = {};
  const callback = (force) => {
    if (!element.active) return;
    let [x, y] = getComputedStyle(element.node).getPropertyValue("position-area").split(" ");
    const anchorRect = target.getBoundingClientRect();
    const elementRect = element.node.getBoundingClientRect();
    if (x === "left" || x === "start") x = anchorRect.right - elementRect.width;
    else if (x === "right" || x === "end") x = anchorRect.left;
    else x = anchorRect.left - elementRect.width / 2;
    if (y === "top" || y === "start") y = anchorRect.top - elementRect.height;
    else if (y === "bottom" || y === "end") y = anchorRect.bottom;
    else y = anchorRect.top - elementRect.height / 2;
    if (!force && x === last.x && y === last.y) return;
    element.node.style.setProperty("inset", `${y}px auto auto ${x}px`);
    last = { x, y };
  };
  if (eventObservers.length === 0) {
    window.addEventListener(
      "scroll",
      () => {
        for (let i = 0, len = eventObservers.length; i < len; i++) eventObservers[i]();
      },
      true,
    );
    window.addEventListener("resize", () => {
      for (let i = 0, len = eventObservers.length; i < len; i++) eventObservers[i]();
    });
  }
  observe(target, callback);
  observe(element.node, callback);
  eventObservers.push(callback);
  requestAnimationFrame(() => callback(true));
  return {
    destroy: () => {
      const index = eventObservers.indexOf(callback);
      if (index !== -1) eventObservers.splice(index, 1);
    },
    update: () => callback(true),
  };
}

function observe(node, callback) {
  if (elementObservers[node]) elementObservers[node].push(callback);
  else {
    elementObservers[node] = [callback];
    new ResizeObserver(() => {
      for (let i = 0, len = elementObservers[node].length; i < len; i++) elementObservers[node][i]();
    }).observe(node);
  }
}
