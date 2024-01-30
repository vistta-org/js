"use strict";
import { createElement, cloneElement } from "../element"
import { Context, newContext, Ref, newRef, State, newState, Effect, newEffect, Form, newForm } from "../classes";
import { Component, Profiler, Render, Scope, Suspense, Try } from "../components";
import { route } from "./router";
import { Store } from "../store";
import { system, isBrowser } from "../../utils";

system.set("vistta", {
  createElement,
  cloneElement,
  Context, newContext, Ref, newRef, State, newState, Effect, newEffect, Form, newForm,
  route,
  socket: {
    emit() { console.warn("Socket is not available on built apps.") },
    on() { console.warn("Socket is not available on built apps.") }
  },
  Store,
  Component, Profiler, Render, Scope, Suspense, Try,
  isBrowser,
});
