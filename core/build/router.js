import VirtualDom from "../dom";
import { createElement } from "../element";
import { HOOKS_ERROR } from "./hooks";
import { INTERNAL } from "../context";
import { isValidUrl, isServer, system } from "../../utils";

const route = !isServer() ? document.body : {};
const __private = { routes: {} };

window.addEventListener("click", handleClick.bind(route));
window.addEventListener("load", build);

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href } = typeof arg === "object" ? arg : { href: arg };
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      window.location.href = href;
      __private.active = href;
    },
  },
  refresh: {
    value: () => location.reload(),
  },
  active: {
    get: () => __private.active,
  },
  location: {
    get: () => window.location,
  },
  store: {
    get: () => __private?.store,
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

export default route;

export const useRoute = () => {
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
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

function handleClick(event) {
  const { tagName, href, target } = event.target;
  if (tagName !== "A" || (target && target !== "___private")) return;
  event.preventDefault();
  route.navigate(href);
}

async function build() {
  const pathname = route.location.pathname;
  let resource = pathname + (pathname.endsWith("/") ? "" : "/") + "script.js";
  const { default: app, config, store, template } = await system.import(resource);
  __private.store = store;
  __private.dom = new VirtualDom(route, config);
  __private.dom.render(template ? createElement(template, {}, createElement(app)) : createElement(app));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}
