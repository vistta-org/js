/* eslint-disable no-undef */
import { Component, Context, Element, Form, Fragment, Profiler, Ref, Render, Safe, Suspense } from "../core/classes.js";
import { VirtualDom } from "../core/dom.js";
import { File, HistoryContext, ThemeContext } from "../core/utils.js";
import { defineReadonly } from "../utils/index.js";

const app = /** @type {any} */ (globalThis.__app);
const appMain = /** @type {any} */ (globalThis.main);

const vistta = {
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
  router: {
    navigate() {
      console.warn("Router is not available on apps.");
    },
    refresh() {
      console.warn("Router is not available on apps.");
    },
  },
  socket: {
    emit(event, ...args) {
      app.send(event, { args });
    },
    on(event, callback) {
      app.on(event, (_, { args }) => callback(...args));
    },
  },
  File,
  ThemeContext,
  HistoryContext,
};

defineReadonly(window, "vistta", vistta);

setTimeout(() => {
  new VirtualDom("", document.body, appMain.config).render(
    appMain.layout
      ? new Element(appMain.layout.component, {}, new Element(appMain.default, appMain.props))
      : new Element(appMain.default, appMain.props),
  );
}, 0);
