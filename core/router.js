import VirtualDom from "./dom";
import socket from "./socket";
import { isServer, isValidUrl, system } from "@/utils";

const route = system.register(
  "v-route",
  class extends HTMLElement {
    #active;
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
        const content = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app?v=${new Date().toISOString()}`))
          .default;
        //const config = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app/config`))?.config;
        //if (config?.store) store.set(config.store);
        const dom = new VirtualDom(this);
        return dom.render(content, () => {
          this.#routes[href] = dom;
          callback && callback();
        });
      }
      this.replaceChildren(...cached.children);
      document.adoptedStyleSheets = cached.stylesheets;
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
