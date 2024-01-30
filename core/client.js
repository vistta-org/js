"use strict";
import { createElement, cloneElement } from "./element"
import { Context, newContext, Ref, newRef, State, newState, Effect, newEffect, Form, newForm } from "./classes";
import { Component, Profiler, Render, Scope, Suspense, Try } from "./components";
import { route } from "./router";
import { socket } from "./socket";
import { Store } from "./store";
import { system, isBrowser } from "../utils";

system.set("vistta", {
  createElement, cloneElement,
  Context, newContext, Ref, newRef, State, newState, Effect, newEffect, Form, newForm,
  route,
  socket,
  Store,
  Component, Profiler, Render, Scope, Suspense, Try,
  isBrowser
});