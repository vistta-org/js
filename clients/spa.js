import {
  Component,
  Context,
  Element,
  Form,
  Fragment,
  Profiler,
  Ref,
  Render,
  Safe,
  Suspense,
  VirtualContainer,
} from "../core/classes.js";
import { VirtualDom } from "../core/dom.js";
import { Router as BaseRouter, isAppUrl, routes, startViewTransition, updateConfig } from "../core/router.js";
import { Socket } from "../core/socket.js";
import { Anchor, File, Haptics, HistoryContext, Notification, Style, ThemeContext } from "../core/utils/index.js";
import { async, defineReadonly, isValidUrl } from "../utils/index.js";

class Router extends BaseRouter {
  /**
   * @typedef {Object} NavigateOptions
   * @property {string} [href]
   * @property {boolean} [pushState]
   * @property {boolean} [refresh]
   * @property {string} [transition]
   *
   * Navigates to a specified URL using the route manifest.
   * @param {string | NavigateOptions} [arg]
   * @param {NavigateOptions} [options]
   */
  static async navigate(arg, options) {
    const initial = !routes.$init;
    routes.$init = true;
    let { href, pushState, refresh, transition } = typeof arg === "object" ? arg : { href: arg, ...options };
    const updateHistory =
      pushState !== false ? (url) => history.pushState({}, "", url) : (url) => history.replaceState({}, "", url);

    if (isValidUrl(href) && !isAppUrl(href)) return (window.location.href = href);
    const { pathname, hash, search } = href ? new URL(href, window.location.href) : new URL(window.location.href);
    if (
      routes.$previous?.pathname === pathname &&
      routes.$previous?.search === search &&
      routes.$previous?.hash === hash &&
      !refresh
    )
      return;

    if (initial || refresh || pathname !== routes.$current?.pathname) {
      const cachedVirtualDom = routes?.[pathname];
      routes.$current?.disable();
      try {
        if (initial || refresh || !cachedVirtualDom) {
          const loader = resolve(pathname);
          if (!loader) throw new Error(`Route not found: ${pathname}`);
          const { default: app, config, layout, props } = await loader();
          routes[pathname] = new VirtualDom(pathname, document.body, config);
          const effect = transition || config?.transition;
          await async((resolve) => startViewTransition(resolve, effect));
          routes.$current = routes[pathname].render(
            layout ? new Element(layout.component, {}, new Element(app, props)) : new Element(app, props),
          );
          updateConfig(routes.$current.config);
        } else {
          const effect = transition || cachedVirtualDom.config?.transition;
          await async((resolve) => startViewTransition(resolve, effect));
          routes.$current = cachedVirtualDom.enable();
          updateConfig(routes.$current.config);
        }
      } catch (error) {
        console.error(error);
      }
    }

    if ((initial || routes.$previous?.hash !== hash) && hash?.startsWith("#"))
      requestAnimationFrame(() =>
        setTimeout(() => {
          document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
        }, 100),
      );

    routes.$previous = { pathname, hash, search };
    updateHistory(pathname + search + hash);
  }

  /**
   * Refreshes the current page. If the `force` parameter is true, it will perform a full page reload. Otherwise, it will re-render the current page using the existing virtual DOM.
   * @param {boolean} [force=false] - If true, forces a full page reload. If false, re-renders the current page using the existing virtual DOM. Defaults to false.
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete.
   */
  static async refresh(force) {
    if (force) return location.reload();
    await this.navigate({ refresh: true });
  }
}

const vistta = {
  Anchor,
  Component,
  Context,
  Controller: class {
    static set host(value) {
      vistta.host = value;
    }
  },
  Element,
  File,
  Form,
  Fragment,
  Haptics,
  HistoryContext,
  Notification,
  Profiler,
  Ref,
  Render,
  Router,
  Safe,
  Socket,
  Style,
  Suspense,
  ThemeContext,
  VirtualContainer,
};

defineReadonly(window, "vistta", vistta);
defineReadonly(
  window,
  "platform",
  ((agent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "") =>
    agent.includes("android") || agent.includes("iphone") || agent.includes("ipad") ? "mobile" : "desktop")(),
);

window.addEventListener("popstate", () => Router.navigate({ href: window.location.href, pushState: false }));
window.addEventListener("click", (event) => {
  const { tagName, href, target, download } = /** @type {HTMLAnchorElement} */ (event.target);
  if (tagName !== "A" || (target && target !== "___private") || !href || download) return;
  const hash = href.replace(location.origin + "/", "");
  event.preventDefault();
  Router.navigate(!hash?.startsWith("#") ? href : hash);
});

// @ts-ignore
// eslint-disable-next-line no-undef
routes.$manifest = APP_ROUTES;
Router.navigate({ href: window.location.pathname || "/", pushState: false });

function resolve(pathname) {
  if (routes.$manifest[pathname]) return routes.$manifest[pathname];
  const segments = pathname.split("/").filter(Boolean);
  const keys = Object.keys(routes.$manifest);
  for (let i = 0, len = keys.length; i < len; i++) {
    const pattern = keys[i];
    const patternSegments = pattern.split("/").filter(Boolean);
    if (patternSegments.length !== segments.length && !pattern.includes("[...")) continue;
    let match = true;
    for (let j = 0, jlen = patternSegments.length; j < jlen; j++) {
      if (patternSegments[j].startsWith("[...")) break;
      if (patternSegments[j].startsWith("[") && patternSegments[j].endsWith("]")) continue;
      if (patternSegments[j] !== segments[j]) {
        match = false;
        break;
      }
    }
    if (match) return routes.$manifest[pattern];
  }
  return null;
}
