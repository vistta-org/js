import VirtualDom, { createElement } from "./dom";
import socket from "./socket";
import { isServer, isValidUrl, system } from "../utils";

const route = document.body || {};
const __private = { routes: {} };

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href, pushState, callback, refresh } = typeof arg === "object" ? arg : { href: arg };
      if (!refresh) refresh = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      href = new URL(href).pathname;
      if (!refresh && __private.active === href) return;
      __private.active = href;
      const cached = __private.routes?.[href];
      if (pushState !== false) history.pushState({}, "", href);
      if (__private?.dom?.remove) __private.dom.remove();
      if (refresh || !cached) {
        let resource = href + (href.endsWith("/") ? "" : "/") + "resources/app";
        const { default: app, config, store } = await system.import(resource, { cache: false });
        const { styles = [], animation } = config || {};
        __private.animation = animation;
        if (!__private.store) __private.store = store;
        __private.dom = new VirtualDom(this, styles);
        return __private.dom.render(createElement(app), {
          refresh,
          animation: __private.animation,
          callback: () => {
            __private.routes[href] = __private.dom;
            callback && callback();
          },
        });
      }
      __private.dom = cached;
      __private.dom.refresh({ animation: __private.animation, callback: () => callback && callback() });
    },
  },
  refresh: {
    value: (href) => {
      if (__private.routes?.[href]) delete __private.routes[href];
      if (href !== __private.active) return;
      this.classList.toggle("loading", true);
      this.navigate({ refresh: true, callback: () => this.classList.toggle("loading", false) });
    },
  },
  active: {
    get: () => __private.active,
  },
  location: {
    get: () => {
      if (isServer()) return system.get("route.location");
      return window.location;
    },
  },
  store: {
    get: () => {
      if (isServer()) return system.get("route.store");
      return __private.store;
    },
  },
  emit: {
    value: (event, details) =>
      route?.dispatchEvent(
        new CustomEvent(event.toLowerCase(), {
          bubbles: true,
          composed: true,
          detail: details,
        }),
      ),
  },
  on: {
    value: (event, callback) => route?.addEventListener(event, callback, false),
  },
});

system.addEventListener("click", handleClick);
system.addEventListener("popstate", () => route.navigate({ pushState: false }));
system.addEventListener("load", () => (route.navigate({ refresh: true }), handleSocket()));

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

function handleClick(event) {
  const { tagName, href, target } = event.target;
  if (tagName !== "A" || (target && target !== "___private")) return;
  event.preventDefault();
  route.navigate(href);
}

function handleSocket() {
  if (socket.active === false) return setTimeout(handleSocket, 250);
  socket.router = route;
  socket.instance.on(`@app/refresh`, (href) => route.refresh(href));
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
