"use strict";
import { createElement, cloneElement } from "../element"
import { Context, context, Ref, ref, State, state, Effect, effect, Form, form } from "../tools";
import { Component, Profiler, Render, Suspense, Try } from "../components";
import { route } from "./router";
import { Store } from "../store";
import { system, isBrowser, apply } from "../../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  Context, context, Ref, ref, State, state, Effect, effect, Form, form,
  route,
  socket: {
    emit() { console.warn("Socket is not available on built apps.") },
    on() { console.warn("Socket is not available on built apps.") }
  },
  Store,
  Component, Profiler, Render, Suspense, Try,
  isBrowser, apply
});
