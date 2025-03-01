import { defineReadonly } from "../../utils/index.js";

if (typeof window === "undefined") {
  global.window = global;
  defineReadonly(global, "isServer", true);
  defineReadonly(global, "document", { scripts: [] });
  defineReadonly(global, "HTMLElement", class { });
  defineReadonly(global, "MutationObserver", class { });
  defineReadonly(global, "IntersectionObserver", class { });
  defineReadonly(global, "ResizeObserver", class { });
  defineReadonly(global, "localStorage", {
    setItem: () => null,
    getItem: () => undefined,
    removeItem: () => null,
    clear: () => null,
  });
  defineReadonly(global, "sessionStorage", {
    setItem: () => null,
    getItem: () => undefined,
    removeItem: () => null,
    clear: () => null,
  });
  defineReadonly(global, "addEventListener", () => null);
  defineReadonly(global, "removeEventListener", () => null);
}