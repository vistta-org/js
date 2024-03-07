"use strict";
import { createElement, cloneElement } from "../element"
import { Ref, Component, Suspense, Profiler, Render, Try } from "../classes"; //, Form
import { route } from "./router";
// import { Store } from "../store";
import { system, isBrowser, apply } from "../../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  route,
  socket: {
    emit() { console.warn("Socket is not available on built apps.") },
    on() { console.warn("Socket is not available on built apps.") }
  },
  // Store,
  Ref, Component, Suspense, Profiler, Render, Try, //  Form,
  isBrowser, apply
});
