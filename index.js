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
  ScopedFragment,
  Suspense,
} from "./core/classes.js";
export { assignStyle, File, HistoryContext, ThemeContext } from "./core/utils.js";
export { default as router } from "./web/client/router.js";
export { default as Controller, copy, del, get, move, patch, post, put, socket } from "./web/server/controller.js";
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
