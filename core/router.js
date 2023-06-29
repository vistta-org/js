import VirtualDom from "./dom";
import socket from "./socket";
import { isServer, isValidUrl, system } from "../utils";

const route = system.register(
  "v-route",
  class extends HTMLElement {
    #active;
    #dom;
    #routes = {};

    constructor() {
      super();
      if (isServer()) return;
      this.navigate();
      handleSocket(this);
      window.addEventListener("popstate", () => this.navigate({ pushState: false }));
    }

    async navigate(arg) {
      let { href, pushState, callback, force } = typeof arg === "object" ? arg : { href: arg };
      if (!force) force = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      href = new URL(href).pathname;
      if (!force && this.#active === href) return;
      this.#active = href;
      const cached = this.#routes?.[href];
      if (pushState !== false) history.pushState({}, "", href);
      if (force || !cached) {
        let app = href + (href.endsWith("/") ? "" : "/") + "resources/app";
        const { store, styles } = await loadConfig(app);
        this.#dom = new VirtualDom(this, styles, store);
        return this.#dom.render((await system.import(app, { cache: false })).default, () => {
          this.#routes[href] = this.#dom;
          callback && callback();
        });
      }
      this.#dom = cached;
      this.#dom.replace(() => callback && callback());
    }

    refresh(href) {
      if (this.#routes?.[href]) delete this.#routes[href];
      if (href !== this.#active) return;
      this.classList.toggle("loading", true);
      this.navigate({ force: true, callback: () => this.classList.toggle("loading", false) });
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

async function loadConfig(href) {
  try {
    return (await system.import(`${href}/config`, { cache: false }))?.config || {};
  } catch {
    return {};
  }
}
