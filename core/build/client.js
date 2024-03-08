"use strict";
import { createElement, cloneElement } from "../element"
import { route } from "./router";
import { Context } from "../context";
import { Ref, Component, Suspense, Profiler, Render, Try } from "../classes"; //, Form
import { system, isBrowser, apply } from "../../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  route,
  Context,
  socket: {
    emit() { console.warn("Socket is not available on built apps.") },
    on() { console.warn("Socket is not available on built apps.") }
  },
  Ref, Component, Suspense, Profiler, Render, Try, //  Form,
  isBrowser, apply
});
