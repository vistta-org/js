import VirtualDom from "./dom";
import { createElement } from "./element";
import { socket } from "./socket";
import { isValidUrl, noCache, system } from "../utils";

let dom;
const route = !process.env.IS_NODE ? document.body : {};
const routes = {}

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href, pushState, callback, refresh, initial } = typeof arg === "object" ? arg : { href: arg };
      if (href?.startsWith("#")) return updateHash(href);
      if (!refresh && !initial) refresh = href === true;
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      const { pathname, hash } = new URL(href);
      if (!refresh && !initial && dom.pathname === pathname) return updateHash(hash);
      const cached = routes?.[pathname];
      if (pushState !== false) history.pushState({}, "", pathname);
      dom?.remove?.();
      if (initial || refresh || !cached) {
        const appHref = pathname + (pathname.endsWith("/") ? "" : "/") + "resources/app";
        if (!initial) document.querySelector("link#app-style").href = noCache(appHref + ".css");
        const { default: app, config, template, props } = await import(noCache(appHref + ".js"));
        dom = new VirtualDom(pathname, route, config);
        return dom.render(template ? createElement(template, {}, createElement(app, props)) : createElement(app, props), refresh, (config) => {
          updateConfig(config);
          routes[pathname] = dom;
          updateHash(hash);
          callback && callback();
        });
      }
      dom = cached;
      dom.refresh((config) => {
        updateConfig(config);
        updateHash(hash);
        callback && callback(config);
      });
    },
  },
  refresh: {
    value: (href) => {
      if (routes?.[href]) delete routes[href];
      if (href !== dom.pathname) return;
      route.classList.toggle("loading", true);
      route.navigate({ refresh: true, callback: () => route.classList.toggle("loading", false) });
    },
  },
  pathname: {
    get: () => dom.pathname,
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
system.addEventListener("load", () => (handlerServiceWorker(), handleSocket(), route.navigate({ initial: true })));

export default route;

export { route };

//

function updateConfig(config) {
  const keys = Object.keys(config);
  for (let i1 = 0, len1 = keys.length; i1 < len1; i1++) {
    switch (keys[i1]) {
      case "title":
        document.title = config.title
        break;
      case "href":
        document.querySelector(`head > base`)?.setAttribute("href", config.href);
        break;
      case "icon":
        var icons = document.querySelectorAll(`head > link[rel$="icon"]`);
        for (let i2 = 0, len2 = icons.length; i2 < len2; i2++)
          icons[i2].setAttribute("href", config.icon);
        break;
      default:
        document.querySelector(`head > meta[name="${keys[i1]}"]`)?.setAttribute("content", config[keys[i1]]);
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
  socket.register(route);
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
