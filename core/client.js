"use strict";
import { createElement, cloneElement } from "./element"
import { route } from "./router";
import { Context } from "./context";
import { socket } from "./socket";
import { Ref, Component, Suspense, Profiler, Render, Try, /*Form*/ } from "./classes";
import { system, isBrowser, apply } from "../utils";

system.set("vistta", {
  createElement, cloneElement,
  route,
  Context,
  socket,
  Ref, Component, Suspense, Profiler, Render, Try,
  isBrowser, apply
});