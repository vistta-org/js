/// <reference types="./global" />
/// <reference types="node"/>

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
} from "./core/classes";
export { router } from "./web/client/router";
export { default as Controller, copy, del, get, move, patch, post, put, socket } from "./web/server/controller";
