import { Element } from "../../core/classes.js";
import { VirtualDom } from "../../core/dom.js";
import { BoundClass, async, isValidUrl } from "../../utils/index.js";

export class Router extends BoundClass {
  #routes = {};
  #virtualDom;
  #loaded = false;
  #previous = null;

  /**
   *
   * @typedef {Object} NavigateOptions
   * @property {string} [href] - The URL to navigate to. Can be a full URL or a relative path.
   * @property {boolean} [pushState] - Determines whether to use pushState (true) or replaceState (false) for history management. Defaults to true.
   * @property {boolean} [refresh] - If true, forces a refresh of the current page even if the URL hasn't changed. Defaults to false.
   * @property {boolean} [force] - If true, forces a full page load instead of using the virtual DOM for navigation. Defaults to false.
   * @property {string} [transition] - The view transition type to use (e.g. "slide-left", "slide-right", "slide-up", "slide-down"). Overrides the page config transition.
   *
   * Navigates to a specified URL or updates the current page based on the provided options.
   * @param {string | NavigateOptions} [arg]
   * @param {NavigateOptions} [options]
   */
  async navigate(arg, options) {
    const initial = !this.#loaded;
    this.#loaded = true;
    let { href, pushState, refresh, force, transition } = typeof arg === "object" ? arg : { href: arg, ...options };
    const updateHistory =
      pushState !== false ? (url) => history.pushState({}, "", url) : (url) => history.replaceState({}, "", url);

    if (force) return (window.location.href = href);
    if (isValidUrl(href) && !isAppUrl(href)) return (window.location.href = href);
    const { pathname, hash, search } = href ? new URL(href, window.location.href) : new URL(window.location.href);
    if (this.#previous?.pathname === pathname && this.#previous?.search === search && this.#previous?.hash === hash) return;

    if (initial || refresh || pathname !== this.#virtualDom.pathname) {
      const cachedVirtualDom = this.#routes?.[pathname];
      this.#virtualDom?.disable();
      try {
        if (initial || refresh || !cachedVirtualDom) {
          const {
            default: app,
            config,
            layout,
            props,
          } = await import(`${pathname}${pathname.endsWith("/") ? "" : "/"}page.js`);
          this.#routes[pathname] = new VirtualDom(pathname, document.body, config);
          const effect = transition || config?.transition;
          await async((resolve) => startViewTransition(resolve, effect));
          this.#virtualDom = this.#routes[pathname].render(
            layout ? new Element(layout.component, {}, new Element(app, props)) : new Element(app, props),
          );
          updateConfig(this.#virtualDom.config);
        } else {
          const effect = transition || cachedVirtualDom.config?.transition;
          await async((resolve) => startViewTransition(resolve, effect));
          this.#virtualDom = cachedVirtualDom.enable();
          updateConfig(this.#virtualDom.config);
        }
      } catch (error) {
        console.log(error);
      }
    }

    if ((initial || this.#previous.hash !== hash) && hash?.startsWith("#"))
      requestAnimationFrame(() =>
        setTimeout(() => {
          document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 100),
      );

    this.#previous = { pathname, hash, search };
    updateHistory(pathname + search + hash);
  }

  /**
   * Refreshes the current page. If the `force` parameter is true, it will perform a full page reload. Otherwise, it will re-render the current page using the existing virtual DOM.
   * @param {boolean} [force=false] - If true, forces a full page reload. If false, re-renders the current page using the existing virtual DOM. Defaults to false.
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete.
   */
  async refresh(force) {
    if (force) return location.reload();
    await this.navigate({ refresh: true });
  }

  /**
   * Returns the current location object.
   * @returns {Location} The current location object.
   */
  get location() {
    return window["page"]?.location ?? window.location;
  }

  get loaded() {
    return this.#loaded;
  }

  /**
   * Emits a custom event on the document body with the specified name and details.
   * @param {string} event
   * @param {any} [details]
   */
  emit(event, details) {
    document.body?.dispatchEvent(
      new CustomEvent(event.toLowerCase(), {
        bubbles: true,
        composed: true,
        detail: details,
      }),
    );
  }

  /**
   * Registers an event listener for the specified event on the document body.
   * @param {string} event
   * @param {(event: any) => void} callback
   */
  on(event, callback) {
    document.body?.addEventListener(event, callback, false);
  }
}

export default new Router();

function startViewTransition(callback, transition) {
  if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (transition) {
      injectTransitionStyles();
      document.documentElement.dataset.transition = transition;
    }
    const t = document.startViewTransition(callback);
    if (transition) t.finished.then(() => delete document.documentElement.dataset.transition);
  } else callback();
}

function injectTransitionStyles() {
  if (document.getElementById("router-transitions")) return;
  const style = document.createElement("style");
  style.id = "router-transitions";
  style.textContent = `
    @keyframes vt-slide-to-left { to { transform: translateX(-100%) } }
    @keyframes vt-slide-from-left { from { transform: translateX(-100%) } }
    @keyframes vt-slide-to-right { to { transform: translateX(100%) } }
    @keyframes vt-slide-from-right { from { transform: translateX(100%) } }
    @keyframes vt-slide-to-top { to { transform: translateY(-100%) } }
    @keyframes vt-slide-from-top { from { transform: translateY(-100%) } }
    @keyframes vt-slide-to-bottom { to { transform: translateY(100%) } }
    @keyframes vt-slide-from-bottom { from { transform: translateY(100%) } }
    [data-transition="slide-left"]::view-transition-old(root) { animation: 0.3s ease-in-out both vt-slide-to-left }
    [data-transition="slide-left"]::view-transition-new(root) { animation: 0.3s ease-in-out both vt-slide-from-right }
    [data-transition="slide-right"]::view-transition-old(root) { animation: 0.3s ease-in-out both vt-slide-to-right }
    [data-transition="slide-right"]::view-transition-new(root) { animation: 0.3s ease-in-out both vt-slide-from-left }
    [data-transition="slide-up"]::view-transition-old(root) { animation: 0.3s ease-in-out both vt-slide-to-top }
    [data-transition="slide-up"]::view-transition-new(root) { animation: 0.3s ease-in-out both vt-slide-from-bottom }
    [data-transition="slide-down"]::view-transition-old(root) { animation: 0.3s ease-in-out both vt-slide-to-bottom }
    [data-transition="slide-down"]::view-transition-new(root) { animation: 0.3s ease-in-out both vt-slide-from-top }
    [data-transition="none"]::view-transition-old(root),
    [data-transition="none"]::view-transition-new(root) { animation: none }
  `;
  document.head.appendChild(style);
}

function updateConfig(config) {
  const keys = Object.keys(config);
  for (let i1 = 0, len1 = keys.length; i1 < len1; i1++) {
    switch (keys[i1]) {
      case "title":
        document.title = config.title;
        break;
      case "href":
        document.querySelector(`head > base`)?.setAttribute("href", config.href);
        break;
      case "icon":
        var icons = document.querySelectorAll(`head > link[rel$="icon"]`);
        for (let i2 = 0, len2 = icons.length; i2 < len2; i2++) icons[i2].setAttribute("href", config.icon);
        break;
      default:
        document.querySelector(`head > meta[name="${keys[i1]}"]`)?.setAttribute("content", config[keys[i1]]);
        break;
    }
  }
}

function isAppUrl(href) {
  return new URL(window.location.href).host === new URL(href).host;
}
