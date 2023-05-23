import { isServer, system } from "../utils";
import { socket } from "./socket";

const Route = system.register(
  "v-route",
  class extends HTMLElement {
    active;
    #routes = {};

    set loading(value) {
      this?.classList?.toggle("loading", !!value);
    }

    constructor() {
      super();
      if (isServer()) return;
      const interval = setInterval(() => {
        if (typeof this?.navigate !== "function") return;
        clearInterval(interval);
        this.navigate();
        handleSocket(this);
      }, 0);
    }

    get(href) {
      return this.#routes?.[href];
    }

    set(href, dom) {
      this.#routes[href] = dom;
    }

    get location() {
      if (isServer()) return system.get("route.location");
      return window.location;
    }

    emit(event, details) {
      this?.dispatchEvent(
        new CustomEvent(event.toLowerCase(), {
          bubbles: true,
          composed: true,
          detail: details,
        })
      );
    }

    on(event, callback) {
      this?.addEventListener(event, callback, false);
    }
  }
);

export default Route;

export const useRoute = () => ({
  navigate: (...args) => Route.navigate(...args),
  emit: (...args) => Route.emit(...args),
  on: (...args) => Route.on(...args),
  get location() {
    return Route.location;
  },
});

export { buildUrl, isAppUrl };

//

function handleSocket(router) {
  if (socket.active === false) return;
  if (!socket?.serverId) return setTimeout(() => handleSocket(router), 250);
  socket.router = router;
  socket.instance.on(`/${socket.serverId}/refresh`, (href) => {
    router.routes.delete(href);
    if (href !== router.active) return;
    router.loading = true;
    router.navigate(true, () => (router.loading = false));
  });
}

function buildUrl(href) {
  const url = new URL(window.location.href);
  if (href?.includes("?")) {
    const [pathname, search] = href.split(/\?(.*)/s);
    url.pathname = pathname;
    url.pathname = search;
  } else url.pathname = href;
  return url.href;
}

function isAppUrl(href) {
  return new URL(window.location.href).host === new URL(href).host;
}
