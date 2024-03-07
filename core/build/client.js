"use strict";
import { createElement, cloneElement } from "../element"
import { Component, Profiler } from "../classes"; //, Render, Suspense, Try, Form
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
  Store,
  Component, Profiler,// Render, Suspense, Try, Form,
  isBrowser, apply
});
