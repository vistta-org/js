"use strict";
import { createElement, cloneElement } from "../element"
import { route } from "./router";
import { Context, Ref, Component, Suspense, Profiler, Render, Try, Form } from "../classes";
import { system, isBrowser, apply } from "../../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  route,
  Context, Ref, Component, Suspense, Profiler, Render, Try, Form,
  socket: {
    emit() { console.warn("Socket is not available on built apps.") },
    on() { console.warn("Socket is not available on built apps.") }
  },
  isBrowser, apply
});
