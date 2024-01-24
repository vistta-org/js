import VirtualDom from "./dom";
import { createElement } from "./element";
import socket from "./socket";
import { RENDER } from "./internal";
import { isValidUrl, noCache, system } from "../utils";

const route = !process.env.IS_NODE ? document.body : {};
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
        const { default: app, config, template } = await import(noCache(resource));
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
      if (process.env.IS_NODE) return system.get("route.location");
      return window.location;
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

export const useRoute = () => {
  if (!RENDER.IS_ACTIVE("Route")) return null;
  return {
    navigate: (...args) => route.navigate(...args),
    emit: (...args) => route.emit(...args),
    on: (...args) => route.on(...args),
    get location() {
      return route.location;
    },
  }
};

//

function updateConfig(config) {
  const keys = Object.keys(config);
  for (let i = 0, len = keys.length; i < len; i++) {
    switch (keys[i]) {
      case "title":
        document.title = config.title
        break;
      case "href":
        document.querySelector(`head > base`)?.setAttribute("href", config.href);
        break;
      case "icon":
        var icons = document.querySelectorAll(`head > link[rel$="icon"]`);
        for (let ii = 0, ilen = icons.length; ii < ilen; ii++)
          icons[ii].setAttribute("href", config.icon);
        break;
      default:
        document.querySelector(`head > meta[name="${keys[i]}"]`)?.setAttribute("content", config[keys[i]]);
        break;
    }
  }
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
