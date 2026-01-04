import { clone } from "@vistta/utils";
import { Context, Ref } from "./classes.js";
export { assignStyle } from "./style.js";

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
          history.pushState(clone({ ...prev, ...state }, true), document.title, location.href);
          return { ...prev, ...state };
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
  let position = "bottom";
  if (typeof target === "object" && target.position) ({ position, target } = target);
  target = typeof target === "string" ? document.querySelector(target) : target;
  const { changed, set } = getPositioning(position);
  if (target instanceof Ref) target = target.node;
  if (!target) return;
  let last = target.getBoundingClientRect();
  const observer = (force) => {
    const rect = target.getBoundingClientRect();
    if (!force && !changed(last, rect)) return;
    last = set(element, rect);
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
  if (elementObservers[target]) elementObservers[target].push(observer);
  else {
    elementObservers[target] = [observer];
    new ResizeObserver(() => {
      for (let i = 0, len = elementObservers[target].length; i < len; i++) elementObservers[target][i]();
    }).observe(target);
  }
  eventObservers.push(observer);
  requestAnimationFrame(() => observer(true));
}

function getPositioning(position) {
  if (position === "top")
    return {
      changed: (last, rect) => rect.top !== last.top || rect.left !== last.left || rect.width !== last.width,
      set: (target, rect) => {
        if (!target.attributes.style)
          target.setAttribute("style", `bottom: ${rect.top}px; left: ${rect.left + rect.width / 2}px;`);
        else {
          const value = target.attributes.style.nodeValue.replace(/\b(?:bottom|left):[^;]+;/g, "").trim();
          target.attributes.style.nodeValue = `${value}${value === "" ? "" : "; "}bottom: ${rect.top}px; left: ${rect.left + rect.width / 2}px;`;
        }
        return rect;
      },
    };
  else if (position === "bottom")
    return {
      changed: (last, rect) => rect.bottom !== last.bottom || rect.left !== last.left || rect.width !== last.width,
      set: (target, rect) => {
        if (!target.attributes.style)
          target.setAttribute("style", `top: ${rect.bottom}px; left: ${rect.left + rect.width / 2}px;`);
        else {
          const value = target.attributes.style.nodeValue.replace(/\b(?:top|left):[^;]+;/g, "").trim();
          target.attributes.style.nodeValue = `${value}${value === "" ? "" : "; "}top: ${rect.bottom}px; left: ${rect.left + rect.width / 2}px;`;
        }
        return rect;
      },
    };
  else if (position === "left")
    return {
      changed: (last, rect) => rect.top !== last.top || rect.right !== last.right || rect.height !== last.height,
      set: (target, rect) => {
        if (!target.attributes.style)
          target.setAttribute("style", `top: ${rect.top + rect.height / 2}px; left: ${rect.right}px;`);
        else {
          const value = target.attributes.style.nodeValue.replace(/\b(?:top|left):[^;]+;/g, "").trim();
          target.attributes.style.nodeValue = `${value}${value === "" ? "" : "; "}top: ${rect.top + rect.height / 2}px; left: ${rect.right}px;`;
        }
        return rect;
      },
    };
  else if (position === "right")
    return {
      changed: (last, rect) => rect.top !== last.top || rect.left !== last.left || rect.height !== last.height,
      set: (target, rect) => {
        if (!target.attributes.style)
          target.setAttribute("style", `top: ${rect.top + rect.height / 2}px; left: ${rect.left}px;`);
        else {
          const value = target.attributes.style.nodeValue.replace(/\b(?:top|left):[^;]+;/g, "").trim();
          target.attributes.style.nodeValue = `${value}${value === "" ? "" : "; "}top: ${rect.top + rect.height / 2}px; left: ${rect.left}px;`;
        }
        return rect;
      },
    };
}
