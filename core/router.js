import { VirtualDom } from "./dom.js";
import { Element } from "./classes.js";
import { isValidUrl, BoundClass, RESOURCES_PATH } from "../utils/index.js";

// TODO: Replace styles and save initial ones into dom stylesheet

class Router extends BoundClass {
  #routes = {};
  #virtualDom;
  #initialHref;
  
  async navigate(arg) {
    const initial = !this.#initialHref;
    let { href, pushState, callback, refresh } =
      typeof arg === "object" ? arg : { href: arg };
    if (href?.startsWith("#")) return updateHash(href);
    if (!refresh && !initial) refresh = href === true;
    if (!isValidUrl(href))
      href = buildUrl(typeof href === "string" ? href : location.pathname);
    if (!isAppUrl(href)) return (window.location.href = href);
    const { pathname, hash, search } = new URL(href);
    if (!refresh && !initial && this.#virtualDom.pathname === pathname)
      return updateHash(hash);
    const cachedVirtualDom = this.#routes?.[pathname];
    if (pushState !== false) history.pushState({}, "", pathname + search);
    this.#virtualDom?.disable();
    if (initial || refresh || !cachedVirtualDom) {
      try {
        const {
          default: app,
          config,
          layout,
          props,
        } = await import(
          `${pathname}${pathname.endsWith("/") ? "" : "/"}page.js`
        );
        this.#routes[pathname] = new VirtualDom(
          pathname,
          document.body,
          config
        );
        startViewTransition(() => {
          try {
            this.#virtualDom = this.#routes[pathname].render(
              layout
                ? new Element(layout.component, {}, new Element(app, props))
                : new Element(app, props)
            );
            updateConfig(this.#virtualDom.config);
            updateHash(hash);
            callback?.();
          } catch (e) {
            console.error(e);
          }
        });
      } catch {
        window.location.href = href;
      }
    } else
      startViewTransition(() => {
        try {
          this.#virtualDom = cachedVirtualDom.enable();
          updateConfig(this.#virtualDom.config);
          updateHash(hash);
          callback?.();
        } catch (e) {
          console.error(e);
        }
      });
  }

  refresh(href) {
    if (!href) href = this.#virtualDom.pathname;
    if (this.#routes?.[href]) delete this.#routes[href];
    if (href !== this.#virtualDom.pathname) return;
    document.body.classList.toggle("loading", true);
    this.navigate({
      refresh: true,
      callback: () => document.body.classList.toggle("loading", false),
    });
  }

  load() {
    if (this.#initialHref) return;
    this.navigate();
    window.addEventListener("click", (event) => handleClick(event, this));
    if (
      !("serviceWorker" in navigator) ||
      !document.querySelector(`head > link[rel="manifest"]`)
    )
      return;
    navigator.serviceWorker
      .register(`/${RESOURCES_PATH}/sw.js`)
      .then(undefined, (error) =>
        console.log(`Service worker registration failed: ${error}`)
      );
  }

  get location() {
    return window.page?.location ?? window.location;
  }

  emit(event, details) {
    document.body?.dispatchEvent(
      new CustomEvent(event.toLowerCase(), {
        bubbles: true,
        composed: true,
        detail: details,
      })
    );
  }

  on(event, callback) {
    document.body?.addEventListener(event, callback, false);
  }
}

export default new Router();

function startViewTransition(callback) {
  if (document.startViewTransition) document.startViewTransition(callback);
  else callback();
}

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

function handleClick(event, router) {
  const { tagName, href, target } = event.target;
  if (tagName !== "A" || (target && target !== "___private") || !href) return;
  event.preventDefault();
  const hash = href.replace(location.origin + "/", "");
  if (hash?.startsWith("#")) updateHash(hash);
  else router.navigate(href);
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
