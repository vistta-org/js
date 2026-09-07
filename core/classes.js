export { Component } from "./component.js";
export { Form, Profiler, Render, Safe, Suspense, VirtualContainer } from "./components/index.js";
export { Context } from "./context.js";
export { Element } from "./element.js";
export { Mutation } from "./mutation.js";
export { spreadProps } from "./props.js";
export { Ref } from "./ref.js";
export { Fragment, TextNode } from "./symbols.js";

import { defineReadonly } from "../utils/index.js";
import { Element } from "./element.js";
import { createDomMutation } from "./mutation.js";
import { spreadProps } from "./props.js";
import { Fragment } from "./symbols.js";

// Global

defineReadonly(window, "Fragment", Fragment);
defineReadonly(window, "prop", (caller) => createDomMutation(caller));
defineReadonly(window, "child", (caller) => createDomMutation(caller));
defineReadonly(window, "spread", spreadProps);
defineReadonly(window, "element", (type, props, ...children) => new Element(type, props, ...children));
