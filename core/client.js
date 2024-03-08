"use strict";
import { createElement, cloneElement } from "./element"
import { Context, Ref, Component, Suspense, Profiler, Render, Try, /*Form*/ } from "./classes";
import { route } from "./router";
import { socket } from "./socket";
// import { Store } from "./store";
import { system, isBrowser, apply } from "../utils";

system.set("vistta", {
  createElement, cloneElement,
  route,
  socket,
  //  Store,
  Context, Ref, Component, Suspense, Profiler, Render, Try,
  isBrowser, apply
});