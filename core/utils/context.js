import { clone } from "@vistta/utils";
import { Context } from "../classes.js";

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
