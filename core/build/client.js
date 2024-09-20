"use strict";
import {
  Fragment,
  Element,
  Context,
  Ref,
  Component,
  Suspense,
  Profiler,
  Render,
  Safe,
  Form,
} from "../classes";
import { route } from "./router";
import { defineReadonly } from "../../utils";

defineReadonly(window, "vistta", {
  Fragment,
  Element,
  Context,
  Ref,
  Component,
  Suspense,
  Profiler,
  Render,
  Safe,
  Form,
  route,
  socket: {
    emit() {
      console.warn("Socket is not available on built apps.");
    },
    on() {
      console.warn("Socket is not available on built apps.");
    },
  }
});
