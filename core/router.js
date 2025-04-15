import { VirtualDom } from "./dom.js";
import { Element } from "./classes.js";
import {
  isValidUrl,
  buildUrl,
  BoundClass,
  RESOURCES_PATH,
} from "../utils/index.js";

export class Router extends BoundClass {
  #routes = {};
  #virtualDom;
  #loaded = false;

  /**
   *
   *
   * @typedef {Object} NavigateOptions
   * @property {string} [href] -
   * @property {boolean} [pushState] -
   * @property {boolean} [refresh] -
   *
   * @param {string | NavigateOptions} [href]
   */
  navigate(arg) {
    const initial = !this.#loaded;
    this.#loaded = true;
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      let { href, pushState, refresh } =
        typeof arg === "object" ? arg : { href: arg };
      if (!refresh && !initial) refresh = href === true;
      if (!isValidUrl(href))
        href = buildUrl(
          typeof href === "string" ? href : window.location.pathname
        );
      console.log("navigate", arg, href);
      if (href?.startsWith("#")) {
        document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        const { pathname, search } = window.location;
        return window.history.replaceState({}, "", pathname + search + href);
      }
      if (!isAppUrl(href)) return (window.location.href = href);
      const { pathname, hash, search } = new URL(href);
      if (!refresh && !initial && this.#virtualDom.pathname === pathname)
        return;
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
              if (hash?.startsWith("#"))
                ensureAnimation(() =>
                  document
                    .querySelector(hash)
                    ?.scrollIntoView({ behavior: "smooth" })
                );
              window.history.replaceState({}, "", pathname + search + hash);
              resolve();
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
            if (hash?.startsWith("#"))
              ensureAnimation(() =>
                document
                  .querySelector(hash)
                  ?.scrollIntoView({ behavior: "smooth" })
              );
            window.history.replaceState({}, "", pathname + search + hash);
            resolve();
          } catch (e) {
            console.error(e);
          }
        });
    });
  }

  /**
   *
   *
   */
  async refresh(href) {
    if (!href) href = this.#virtualDom.pathname;
    if (this.#routes?.[href]) delete this.#routes[href];
    if (href !== this.#virtualDom.pathname) return;
    await this.navigate({ refresh: true });
  }

  async load() {
    if (this.#loaded) return;
    window.addEventListener("click", (event) => handleClick(event, this));
    await this.navigate();
    if (
      !("serviceWorker" in navigator) ||
      !document.querySelector(`head > link[rel="manifest"]`)
    )
      return;
    navigator.serviceWorker
      .register(`/${RESOURCES_PATH}/worker.js`)
      .then(undefined, (error) =>
        console.log(`Service worker registration failed: ${error}`)
      );
  }

  get location() {
    return window.page?.location ?? window.location;
  }

  /**
   *
   *
   *
   * @param {string} event
   * @param {any} [details]
   */
  emit(event, details) {
    document.body?.dispatchEvent(
      new CustomEvent(event.toLowerCase(), {
        bubbles: true,
        composed: true,
        detail: details,
      })
    );
  }

  /**
   *
   *
   *
   * @param {string} event
   * @param {(event: any) => void} callback
   */
  on(event, callback) {
    document.body?.addEventListener(event, callback, false);
  }
}

export default new Router();

function startViewTransition(callback) {
  if (
    document.startViewTransition ||
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    document.startViewTransition(callback);
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
  const hash = href.replace(location.origin + "/", "");
  event.preventDefault();
  router.navigate(!hash?.startsWith("#") ? href : hash);
}

function isAppUrl(href) {
  return new URL(window.location.href).host === new URL(href).host;
}

function ensureAnimation(callback) {
  requestAnimationFrame(() => setTimeout(callback, 100));
}
