import VirtualDom, { createElement } from "../dom";
import { isValidUrl, setImmediate } from "../../utils";

const route = document.body;
const __private = { routes: {} };

window.addEventListener("load", () => {
  window.addEventListener("click", handleClick.bind(route));
  setImmediate(() => build());
});

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href } = typeof arg === "object" ? arg : { href: arg };
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      window.location.href = href;
      __private.active = href;
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
      get: () => __private?.dom?.store,
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
  },
});

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

async function build() {
  if (typeof __import_app === "undefined") return console.error("Internal App Error");
  const {
    default: app,
    config: { styles, store },
  } = __import_app(); // eslint-disable-line no-undef
  __private.dom = new VirtualDom(route, styles, store);
  __private.dom.render(createElement(app));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}
