"use strict";
import {
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
} from "./classes";
import router from "./router";
import { socket } from "./socket";
import { defineReadonly } from "../utils/index.js";

defineReadonly(window, "vistta", {
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
  socket,
});

window.addEventListener("popstate", () => router.navigate({ pushState: false }));
window.addEventListener("load", () => router.load());
