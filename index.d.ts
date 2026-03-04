/// <reference types="./global.d.ts" />

declare module "./core/classes.js" {
  interface Component<Props extends Record<string, any> = Record<string, any>> extends Props {}
  interface Context {
    (): any;
  }
}

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
} from "./core/classes.js";

export { assignStyle, File, HistoryContext, ThemeContext } from "./core/utils.js";
export { default as router } from "./web/client/router.js";
export { default as Controller, copy, del, get, move, patch, post, put, socket } from "./web/server/controller.js";
export { worker } from "./index.js";
