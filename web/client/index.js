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
  ScopedFragment,
  Suspense,
} from "../../core/classes";
import { socket } from "../../core/socket";
import { File, Theme } from "../../core/utils";
import { defineReadonly } from "../../utils/index.js";
import router from "./router";

const vistta = {
  Fragment,
  Element,
  Context,
  Ref,
  Component,
  ScopedFragment,
  Suspense,
  Profiler,
  Render,
  Safe,
  Form,
  router,
  socket,
  File,
  Theme,
};

defineReadonly(window, "vistta", vistta);

window.addEventListener("popstate", () => router.navigate({ href: window.location.href, pushState: false }));
window.addEventListener("load", async () => {
  router.load();
  if (!("serviceWorker" in navigator) || !document.querySelector(`head > link[rel="manifest"]`)) return;
  navigator.serviceWorker
    .register(`/worker.js`)
    .then(async (worker) => (vistta.worker = worker))
    .catch((error) => {
      console.error("Service Worker registration failed:", error);
    });
});
