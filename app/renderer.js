import {
  Component,
  Context,
  Element,
  Form,
  Fragment,
  Profiler,
  Ref,
  Render,
  Safe,
  Suspense,
  VirtualContainer,
} from "../core/classes.js";
import { VirtualDom } from "../core/dom.js";
import { Anchor, File, HistoryContext, Style, ThemeContext } from "../core/utils.js";
import { defineReadonly } from "../utils/index.js";

const ipc = /** @type {any} */ (globalThis.ipc);

const vistta = {
  Anchor,
  Component,
  Context,
  Element,
  File,
  Form,
  Fragment,
  Ref,
  Profiler,
  Suspense,
  VirtualContainer,
  Render,
  Safe,
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
      ipc.send(event, { args });
    },
    on(event, callback) {
      ipc.on(event, (_, { args }) => callback(...args));
    },
  },
  HistoryContext,
  Style,
  ThemeContext,
};

defineReadonly(window, "vistta", vistta);

setTimeout(() => {
  const main = /** @type {any} */ (globalThis.main);
  new VirtualDom("", document.body, main.config).render(
    main.layout
      ? new Element(main.layout.component, {}, new Element(main.default, main.props))
      : new Element(main.default, main.props),
  );
}, 0);
