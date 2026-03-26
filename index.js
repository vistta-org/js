import { proxy } from "@vistta/utils";
import "./core/adapter.js";
export { Component, Context, Element, Form, Fragment, Profiler, Ref, Render, Safe, Suspense } from "./core/classes.js";
export { default as socket } from "./core/socket.js";
export { Anchor, File, HistoryContext, Style, ThemeContext } from "./core/utils.js";
export { default as router } from "./web/client/router.js";
export { default as Controller, COPY, DELETE, GET, MOVE, PATCH, POST, PUT } from "./web/server/controller.js";
export const worker = proxy(
  {},
  {
    get() {
      throw new Error("Worker is not available on server environment.");
    },
    set() {
      throw new Error("Worker is not available on server environment.");
    },
  },
);
