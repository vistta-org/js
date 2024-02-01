"use strict";
import { createElement, cloneElement } from "./element"
import { Context, context, Ref, ref, State, state, Effect, effect, Form, form } from "./classes";
import { Component, Profiler, Render, Scope, Suspense, Try } from "./components";
import { route } from "./router";
import { socket } from "./socket";
import { Store } from "./store";
import { system, isBrowser } from "../utils";

system.set("vistta", {
  createElement, cloneElement,
  Context, context, Ref, ref, State, state, Effect, effect, Form, form,
  route,
  socket,
  Store,
  Component, Profiler, Render, Scope, Suspense, Try,
  isBrowser
});