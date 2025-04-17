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
} from "../core/classes";
import router from "../core/router";
import { socket } from "../core/socket";
import { Theme } from "../core/utils";
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
  Theme,
});

window.addEventListener("popstate", () =>
  router.navigate({ href: window.location.href, pushState: false })
);
window.addEventListener("load", () => router.load());
