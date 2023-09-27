import VirtualDom, { createElement } from "../dom";
import { isServer, isValidUrl, system, setImmediate } from "../../utils";

const route = system.register(
  "app-route",
  class extends HTMLElement {
    #active;
    #dom;
    #routes = {};

    constructor() {
      super();
      if (isServer()) return;
      window.addEventListener("click", this.#handleClick.bind(this));
      setImmediate(() => this.#build());
    }

    async navigate(arg) {
      let { href } = typeof arg === "object" ? arg : { href: arg };
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      window.location.href = href;
      this.#active = href;
    }

    refresh() {
      location.reload();
    }

    get active() {
      return this.#active;
    }

    get location() {
      if (isServer()) return system.get("route.location");
      return window.location;
    }

    get store() {
      if (isServer()) return system.get("route.store");
      return this.#dom?.store;
    }

    emit(event, details) {
      this?.dispatchEvent(
        new CustomEvent(event.toLowerCase(), {
          bubbles: true,
          composed: true,
          detail: details,
        }),
      );
    }

    on(event, callback) {
      this?.addEventListener(event, callback, false);
    }

    #handleClick(event) {
      const { tagName, href, target } = event.target;
      if (tagName !== "A" || (target && target !== "_self")) return;
      event.preventDefault();
      this.navigate(href);
    }

    async #build() {
      if (typeof _importApp === "undefined") return console.error("Internal App Error");
      const {
        app,
        config: { styles, store },
      } = _importApp(); // eslint-disable-line no-undef
      this.#dom = new VirtualDom(this, styles, store);
      this.#dom.render(createElement(app));
    }
  },
);

export default route;

export const useRoute = () => ({
  navigate: (...args) => route.navigate(...args),
  emit: (...args) => route.emit(...args),
  on: (...args) => route.on(...args),
  get location() {
    return route.location;
  },
});

//

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}
