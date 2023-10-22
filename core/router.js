import VirtualDom from "./dom";
import { createElement } from "./element";
import socket from "./socket";
import { isServer, isValidUrl, system } from "../utils";

const route = document.body || {};
const __private = { routes: {} };

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href, pushState, callback, refresh } = typeof arg === "object" ? arg : { href: arg };
      if (href?.startsWith("#")) return updateHash(href);
      if (!refresh) refresh = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      const { pathname, hash } = new URL(href);
      if (!refresh && __private.active === pathname) return updateHash(hash);
      __private.active = pathname;
      const cached = __private.routes?.[pathname];
      if (pushState !== false) history.pushState({}, "", pathname);
      if (__private?.dom?.remove) __private.dom.remove();
      if (refresh || !cached) {
        let resource = pathname + (pathname.endsWith("/") ? "" : "/") + "resources/app";
        const { default: app, config, store, template } = await system.import(resource, { cache: false });
        if (!__private.store) __private.store = store;
        __private.dom = new VirtualDom(route, config);
        return __private.dom.render(template ? createElement(template, {}, createElement(app)) : createElement(app), refresh, (config) => {
          updateConfig(config);
          __private.routes[pathname] = __private.dom;
          updateHash(hash);
          callback && callback();
        });
      }
      __private.dom = cached;
      __private.dom.refresh((config) => {
        updateConfig(config);
        updateHash(hash);
        callback && callback(config);
      });
    },
  },
  refresh: {
    value: (href) => {
      if (__private.routes?.[href]) delete __private.routes[href];
      if (href !== __private.active) return;
      route.classList.toggle("loading", true);
      route.navigate({ refresh: true, callback: () => route.classList.toggle("loading", false) });
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
system.addEventListener("load", () => (handlerServiceWorker(), handleSocket(), route.navigate({ refresh: true })));

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

function updateConfig(config) {
  Object.keys(config).forEach((key) => {
    if (key === "title") return (document.title = config.title);
    if (key === "href") return document.querySelector(`head > base`)?.setAttribute("href", config.href);
    if (key === "icon")
      return document.querySelectorAll(`head > link[rel$="icon"]`)?.forEach((e) => e.setAttribute("href", config.icon));
    document.querySelector(`head > meta[name="${key}"]`)?.setAttribute("content", config[key]);
  });
}

function handleClick(event) {
  const { tagName, href, target } = event.target;
  if (tagName !== "A" || (target && target !== "___private") || !href) return;
  event.preventDefault();
  const hash = href.replace(location.origin + "/", "");
  if (hash?.startsWith("#")) updateHash(hash);
  else route.navigate(href);
}

function handleSocket() {
  if (socket.active === false) return setTimeout(handleSocket, 250);
  socket.router = route;
  socket.instance.on(`@app/refresh`, (href) => route.refresh(href));
}

function handlerServiceWorker() {
  if (!("serviceWorker" in navigator) || !document.querySelector(`head > link[rel="manifest"]`)) return;
  navigator.serviceWorker
    .register("/resources/sw.js")
    .then(undefined, (error) => console.log(`Service worker registration failed: ${error}`));
}

function updateHash(hash) {
  if (hash !== location.hash) window.location.hash = hash;
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
