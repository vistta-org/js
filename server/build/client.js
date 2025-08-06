"use strict";
import {
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
} from "../../core/classes.js";
import router from "./router.js";
import { Theme } from "../../core/utils.js";
import { defineReadonly } from "../../utils/index.js";

defineReadonly(window, "vistta", {
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
  socket: {
    emit() {
      console.warn("Socket is not available on built apps.");
    },
    on() {
      console.warn("Socket is not available on built apps.");
    },
  },
  Theme,
});

window.addEventListener("popstate", () =>
  router.navigate({ pushState: false })
);
window.addEventListener("load", () => router.load());
