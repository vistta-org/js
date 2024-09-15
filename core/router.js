import VirtualDom from "./dom";
import { Element } from "./classes";
import { isValidUrl, system } from "../utils";

let dom;
const route = typeof process === "undefined" ? document.body : {};
const routes = {};

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href, pushState, callback, refresh, initial } =
        typeof arg === "object" ? arg : { href: arg };
      if (href?.startsWith("#")) return updateHash(href);
      if (!refresh && !initial) refresh = href === true;
      if (!isValidUrl(href))
        href = buildUrl(typeof href === "string" ? href : location.pathname);
      if (!isAppUrl(href)) return (location.href = href);
      const { pathname, hash } = new URL(href);
      if (!refresh && !initial && dom.pathname === pathname)
        return updateHash(hash);
      const cached = routes?.[pathname];
      if (pushState !== false) history.pushState({}, "", pathname);
      dom?.remove?.();
      if (initial || refresh || !cached) {
        const appHref = pathname + (pathname.endsWith("/") ? "" : "/") + "page";
        if (!initial)
          document.querySelector("link#app-style").href = appHref + ".css";
        const {
          default: app,
          config,
          layout,
          props,
        } = await import(appHref + ".js");
        dom = new VirtualDom(pathname, route, config);
        return dom.render(
          layout
            ? new Element(layout.component, {}, new Element(app, props))
            : new Element(app, props),
          refresh,
          (config) => {
            updateConfig(config);
            routes[pathname] = dom;
            updateHash(hash);
            callback && callback();
          },
        );
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
    value: (_href) => {
      if (!_href) _href = dom.pathname;
      if (routes?.[_href]) delete routes[_href];
      if (_href !== dom.pathname) return;
      route.classList.toggle("loading", true);
      route.navigate({
        refresh: true,
        callback: () => route.classList.toggle("loading", false),
      });
    },
  },
  location: {
    get: () => {
      if (typeof process !== "undefined") return system.get("page.location");
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
system.addEventListener(
  "load",
  () => (handlerServiceWorker(), route.navigate({ initial: true })),
);

export default route;

export { route };

//

function updateConfig(config) {
  const keys = Object.keys(config);
  for (let i1 = 0, len1 = keys.length; i1 < len1; i1++) {
    switch (keys[i1]) {
      case "title":
        document.title = config.title;
        break;
      case "href":
        document
          .querySelector(`head > base`)
          ?.setAttribute("href", config.href);
        break;
      case "icon":
        var icons = document.querySelectorAll(`head > link[rel$="icon"]`);
        for (let i2 = 0, len2 = icons.length; i2 < len2; i2++)
          icons[i2].setAttribute("href", config.icon);
        break;
      default:
        document
          .querySelector(`head > meta[name="${keys[i1]}"]`)
          ?.setAttribute("content", config[keys[i1]]);
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

function handlerServiceWorker() {
  if (
    !("serviceWorker" in navigator) ||
    !document.querySelector(`head > link[rel="manifest"]`)
  )
    return;
  navigator.serviceWorker
    .register("/resources/sw.js")
    .then(undefined, (error) =>
      console.log(`Service worker registration failed: ${error}`),
    );
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
