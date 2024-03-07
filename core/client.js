"use strict";
import { createElement, cloneElement } from "./element"
import { Ref, Component, Profiler, Render, Try, /*Form, Suspense*/ } from "./classes";
import { route } from "./router";
import { socket } from "./socket";
// import { Store } from "./store";
import { system, isBrowser, apply } from "../utils";

system.set("vistta", {
  createElement, cloneElement,
  route,
  socket,
  //  Store,
  Ref, Component, Profiler, Render, Try,
  isBrowser, apply
});