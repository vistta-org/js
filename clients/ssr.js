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
  VirtualContainer,
} from "../core/classes";
import { Router, routes } from "../core/router.js";
import { Socket } from "../core/socket";
import { Anchor, File, HistoryContext, Style, ThemeContext } from "../core/utils";
import { defineReadonly } from "../utils/index.js";

const vistta = {
  Fragment,
  Element,
  Context,
  Controller: class {
    static set host(value) {
      vistta.host = value;
    }
  },
  Ref,
  Component,
  Suspense,
  VirtualContainer,
  Profiler,
  Render,
  Safe,
  Form,
  Router,
  Socket,
  File,
  Anchor,
  ThemeContext,
  Style,
  HistoryContext,
};

defineReadonly(window, "vistta", vistta);
defineReadonly(window, "platform", "browser");

window.addEventListener("popstate", () => Router.navigate({ href: window.location.href, pushState: false }));
window.addEventListener("load", async () => {
  if (routes.$init) return;
  window.addEventListener("click", (event) => {
    const { tagName, href, target, download } = /** @type {HTMLAnchorElement} */ (event.target);
    if (tagName !== "A" || (target && target !== "___private") || !href || download) return;
    const hash = href.replace(location.origin + "/", "");
    event.preventDefault();
    Router.navigate(!hash?.startsWith("#") ? href : hash);
  });
  Socket.connect();
  await Router.navigate();
  if (!("serviceWorker" in navigator) || !document.querySelector(`head > link[rel="manifest"]`)) return;
  navigator.serviceWorker
    .register(`/worker.js`)
    .then(async (worker) => (vistta.worker = worker))
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
});
