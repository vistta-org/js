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
import { Socket } from "../core/socket.js";
import { Anchor, File, Haptics, HistoryContext, Notification, Scheduler, Style, ThemeContext } from "../core/utils/index.js";
import { defineReadonly } from "../utils/index.js";

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
  Scheduler,
  Socket,
  Style,
  Suspense,
  ThemeContext,
  VirtualContainer,
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
