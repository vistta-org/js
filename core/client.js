"use strict";
import { Fragment, Element, Context, Ref, Component, Suspense, Profiler, Render, Try, Form } from "./classes";
import { route } from "./router";
import { socket } from "./socket";
import { system, isBrowser, apply } from "../utils";

system.set("vistta", {
  Fragment, Element, Context, Ref, Component, Suspense, Profiler, Render, Try, Form,
  route, socket,
  isBrowser, apply
});