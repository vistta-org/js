"use strict";
// import { router, useRouter, buildUrl, isAppUrl } from "./router";
// import { useSocket } from "./socket";
// import { store, createStoreConfig } from "./store";
import * as utils from "../utils";

const { system, isValidUrl } = utils;
//const { createElement, StrictMode } = react;
system.set("vistta", { /*...react, useRouter, useSocket, createStoreConfig,*/ ...utils });

/*router.navigate = async function (href, callback) {
  const force = href === true;
  const hydrate = href == null;
  //
  system.set("hydrate", hydrate);
  if (!isValidUrl(href)) href = buildUrl(typeof href === "string" ? href : location.pathname);
  if (!isAppUrl(href)) return (location.href = href);
  //
  if (!force && !hydrate && this.active === href) return;
  let content = (!hydrate && this.routes.get(href)) || null;
  if (!content) {
    content = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app`)).default;
    const config = (await import(`${href}${href.endsWith("/") ? "" : "/"}resources/app/config`))?.config;
    if (config?.store) store.set(config.store);
  }
  if (!hydrate) {
    if (!this.root) this.root = createRoot(this);
    this.root.render(createElement(StrictMode, null, createElement(content), router.renderedCallback(callback)));
    history.pushState({}, "", href);
    store.refresh();
  } else
    this.root = hydrateRoot(
      this,
      createElement(
        StrictMode,
        null,
        createElement(content),
        router.renderedCallback(() => {
          system.set("hydrate", false);
          store.hydrate();
          callback && callback();
        })
      )
    );
  this.active = new URL(href).pathname;
  this.routes.set(this.active, content);
};

router.renderedCallback = (callback) => createElement(() => callback && callback());
*/