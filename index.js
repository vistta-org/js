import { proxy } from "@vistta/utils";
import "./core/adapter.js";
export {
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
} from "./core/classes.js";
export { requestNextMutation } from "./core/dom.js";
export {
  Anchor,
  Clipboard,
  File,
  Haptics,
  HistoryContext,
  Notification,
  Scheduler,
  Style,
  ThemeContext,
} from "./core/utils/index.js";
export { default as Controller, COPY, DELETE, GET, MOVE, PATCH, POST, PUT, REST } from "./server/controller.js";
export { default as Router } from "./server/router.js";
export { default as Socket } from "./server/socket.js";
export const Worker = proxy(
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
