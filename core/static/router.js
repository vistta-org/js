import VirtualDom, { createElement } from "../dom";
import { isValidUrl, setImmediate } from "../../utils";

const route = document.body;
const self = { routes: {} };

window.addEventListener("load", () => {
  window.addEventListener("click", handleClick.bind(route));
  setImmediate(() => build());
  new MutationObserver((list) => self.dom.onMutation(list)).observe(route, { childList: true, subtree: true });
});

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href } = typeof arg === "object" ? arg : { href: arg };
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      window.location.href = href;
      self.active = href;
    },
    refresh: {
      value: () => location.reload(),
    },
    active: {
      get: () => self.active,
    },
    location: {
      get: () => window.location,
    },
    store: {
      get: () => self?.dom?.store,
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
  if (tagName !== "A" || (target && target !== "_self")) return;
  event.preventDefault();
  route.navigate(href);
}

async function build() {
  if (typeof _importApp === "undefined") return console.error("Internal App Error");
  const {
    app,
    config: { styles, store },
  } = _importApp(); // eslint-disable-line no-undef
  self.dom = new VirtualDom(route, styles, store);
  self.dom.render(createElement(app));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}
