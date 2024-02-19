import VirtualDom from "../dom";
import { createElement } from "../element";
import { INTERNAL } from "../tools";
import { isValidUrl } from "../../utils";

const route = !process.env.IS_NODE ? document.body : {};

window.addEventListener("click", handleClick.bind(route));
window.addEventListener("load", build);

Object.defineProperties(route, {
  navigate: {
    value: async (arg) => {
      let { href } = typeof arg === "object" ? arg : { href: arg };
      if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
      window.location.href = href;
    },
  },
  refresh: {
    value: () => location.reload(),
  },
  active: {
    get: () => INTERNAL.DOM.pathname,
  },
  location: {
    get: () => window.location,
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

export { route };

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
  const { default: app, config, template, props } = await import(resource);
  INTERNAL.DOM = new VirtualDom(pathname, route, config);
  INTERNAL.DOM.render(template ? createElement(template, {}, createElement(app, props)) : createElement(app, props));
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  const [pathname] = href?.includes("?") ? href.split(/\?(.*)/s) : [href];
  if (pathname.startsWith(".")) url.pathname += "/" + pathname;
  else url.pathname = pathname;
  return url.href;
}
