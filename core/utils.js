import { Context } from "./classes.js";

export class Theme extends Context {
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

/*
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
console.log(prefersReducedMotion); // true if "Reduce Motion" is enabled, false otherwise


window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
    console.log('Reduce motion setting changed:', event.matches);
});

*/
