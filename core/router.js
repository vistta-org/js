import VirtualDom from "./dom";
import socket from "./socket";
import { isServer, isValidUrl, system } from "../utils";

const route = system.register(
  "v-route",
  class extends HTMLElement {
    #active;
    #store;
    #routes = {};

    constructor() {
      super();
      if (isServer()) return;
      this.navigate();
      handleSocket(this);
    }

    async navigate(href, callback) {
      const force = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      if (!force && this.#active === href) return;
      const cached = this.#routes?.[href];
      history.pushState({}, "", href);
      this.#active = new URL(href).pathname;
      if (force || !cached) {
        let app = href + (href.endsWith("/") ? "" : "/") + "resources/app";
        const store = await loadStore(app);
        if (store) this.#store = store;
        if (force) app += "?v=" + new Date().toISOString();
        const dom = new VirtualDom(this);
        return dom.render((await import(app)).default, () => {
          this.#routes[href] = { dom, store };
          callback && callback();
        });
      }
      if (cached?.store) this.#store = cached?.store;
      this.replaceChildren(...cached.dom.children);
      document.adoptedStyleSheets = cached.dom.stylesheets;
      callback && callback();
    }

    refresh(href) {
      if (this.#routes?.[href]) delete this.#routes[href];
      if (href !== this.#active) return;
      this.classList.toggle("loading", true);
      this.navigate(true, () => this.classList.toggle("loading", false));
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
      return this.#store;
    }

    emit(event, details) {
      this?.dispatchEvent(
        new CustomEvent(event.toLowerCase(), {
          bubbles: true,
          composed: true,
          detail: details,
        })
      );
    }

    on(event, callback) {
      this?.addEventListener(event, callback, false);
    }
  }
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

function handleSocket(router) {
  if (socket.active === false) return setTimeout(() => handleSocket(router), 250);
  socket.router = router;
  socket.instance.on(`system/refresh`, (href) => router.refresh(href));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  if (href?.includes("?")) {
    const [pathname, search] = href.split(/\?(.*)/s);
    url.pathname = pathname;
    url.pathname = search;
  } else url.pathname = href;
  return url.href;
}

function isAppUrl(href) {
  return new URL(window.location.href).host === new URL(href).host;
}

async function loadStore(href) {
  try {
    return (await import(`${href}/config`))?.config?.store;
  } catch {
    return null;
  }
}
