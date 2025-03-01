import "./adapter.js";
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
  } from "../../core/classes.js";
import router from "../../core/router.js";
import { socket } from "../../core/socket.js";
import { defineReadonly } from "../../utils/index.js";

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
    router,
    socket,
});


export default window.vistta;