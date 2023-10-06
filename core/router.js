import VirtualDom, { createElement } from "./dom";
import socket from "./socket";
import { isServer, isValidUrl, system } from "../utils";

const route = system.register(
  "app-route",
  class extends HTMLElement {
    #active;
    #dom;
    #routes = {};
    #animation;
    #store;

    constructor() {
      super();
      if (isServer()) return;
      this.navigate({ refresh: true });
      handleSocket(this);
      window.addEventListener("popstate", () => this.navigate({ pushState: false }));
      window.addEventListener("click", this.#handleClick.bind(this));
      new MutationObserver((list) => this.#dom?.onMutation(list)).observe(this, { childList: true, subtree: true });
      // if ("serviceWorker" in navigator) navigator.serviceWorker.register("/resources/app/sw");
    }

    async navigate(arg) {
      let { href, pushState, callback, refresh } = typeof arg === "object" ? arg : { href: arg };
      if (!refresh) refresh = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      href = new URL(href).pathname;
      if (!refresh && this.#active === href) return;
      this.#active = href;
      const cached = this.#routes?.[href];
      if (pushState !== false) history.pushState({}, "", href);
      if (refresh || !cached) {
        let resource = href + (href.endsWith("/") ? "" : "/") + "resources/app";
        const { default: app, config, store } = await system.import(resource, { cache: false });
        const { styles = [], animation } = config || {};
        this.#animation = animation;
        if (!this.#store) this.#store = store;
        this.#dom = new VirtualDom(this, styles);
        return this.#dom.render(createElement(app), {
          refresh,
          animation: this.#animation,
          callback: () => {
            this.#routes[href] = this.#dom;
            callback && callback();
          },
        });
      }
      this.#dom = cached;
      this.#dom.replace({ animation: this.#animation, callback: () => callback && callback() });
    }

    refresh(href) {
      if (this.#routes?.[href]) delete this.#routes[href];
      if (href !== this.#active) return;
      this.classList.toggle("loading", true);
      this.navigate({ refresh: true, callback: () => this.classList.toggle("loading", false) });
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

function handleSocket(router) {
  if (socket.active === false) return setTimeout(() => handleSocket(router), 250);
  socket.router = router;
  socket.instance.on(`@app/refresh`, (href) => router.refresh(href));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}

function isAppUrl(href) {
  return new URL(window.location.href).host === new URL(href).host;
}
