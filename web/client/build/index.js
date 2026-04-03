"use strict";
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
} from "../../../core/classes.js";
import { Anchor, File, HistoryContext, Style, ThemeContext } from "../../../core/utils.js";
import { defineReadonly } from "../../../utils/index.js";
import router from "./router.js";

const vistta = {
  Fragment,
  Element,
  Context,
  Ref,
  Component,
  Suspense,
  Profiler,
  Render,
  Safe,
  Form,
  router,
  socket: {
    emit() {
      console.warn("Socket is not available on built apps.");
    },
    on() {
      console.warn("Socket is not available on built apps.");
    },
  },
  Anchor,
  File,
  HistoryContext,
  Style,
  ThemeContext,
};

defineReadonly(window, "vistta", vistta);

window.addEventListener("popstate", () => router.navigate({ pushState: false }));
window.addEventListener("load", async () => {
  if (router.loaded) return;
  window.addEventListener("click", (event) => {
    const { tagName, href, target, download } = /** @type {HTMLAnchorElement} */ (event.target);
    if (tagName !== "A" || (target && target !== "___private") || !href || download) return;
    const hash = href.replace(location.origin + "/", "");
    event.preventDefault();
    router.navigate(!hash?.startsWith("#") ? href : hash);
  });
  await router.navigate();
  if (!("serviceWorker" in navigator) || !document.querySelector(`head > link[rel="manifest"]`)) return;
  navigator.serviceWorker
    .register(`/worker.js`)
    .then(async (worker) => (vistta.worker = worker))
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
});
