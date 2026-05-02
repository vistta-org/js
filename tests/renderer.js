import { TestRunner } from "@vistta/cli";
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
import { defineReadonly, sleep } from "../utils/index.js";

const ipc = /** @type {any} */ (globalThis.ipc);

const FEEDBACK_TIMEOUT = 100;

const runner = new TestRunner(/** @type {any} */ (globalThis.testOptions));
const vistta = {
  Fragment,
  Element,
  Context,
  Ref,
  Component,
  Suspense,
  VirtualContainer,
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
      ipc.send(event, { args });
    },
    on(event, callback) {
      ipc.on(event, (_, { args }) => callback(...args));
    },
  },
  Anchor,
  File,
  HistoryContext,
  Style,
  ThemeContext,
};
let dom;

defineReadonly(window, "vistta", vistta);
defineReadonly(window, "suite", runner.suite);
defineReadonly(window, "test", runner.test);
defineReadonly(window, "expect", runner.expect);
defineReadonly(document, "wait", sleep);
defineReadonly(document, "mount", async (content, props = {}, config = {}) => {
  dom?.disable();
  await sleep(FEEDBACK_TIMEOUT);
  dom = new VirtualDom("", document.body, config).render(new Element(content, props));
  await sleep(FEEDBACK_TIMEOUT);
  return dom;
});
if (process.env.NODE_DEBUG === "true")
  defineReadonly(window, "requestAnimationFrame", (callback) => setTimeout(callback, 1));

const consoleLevels = ["log", "info", "warn", "error", "debug"];
const originalConsole = {};
const serializeConsoleArgs = (args) =>
  args.map((value) => {
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
    if (typeof value === "string") return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  });

for (const level of consoleLevels) {
  originalConsole[level] = console[level]?.bind(console);
  console[level] = (...args) => {
    originalConsole[level]?.(...args);
    try {
      ipc.send("console", { level, args: serializeConsoleArgs(args) });
    } catch {
      // Ignore forwarding errors to avoid breaking tests.
    }
  };
}

HTMLElement.prototype.write = async function (text, options) {
  const { delay = FEEDBACK_TIMEOUT, clear = false, dispatchKeyboardEvents = true } = options || {};
  if (!this || typeof this.value === "undefined") throw new Error("Target must be an input or textarea element");
  if (clear) this.value = "";

  this.focus();

  for (const char of text) {
    if (dispatchKeyboardEvents) {
      this.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
      this.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
    }

    this.value += char;

    this.dispatchEvent(
      new InputEvent("input", {
        data: char,
        inputType: "insertText",
        bubbles: true,
      }),
    );

    if (dispatchKeyboardEvents) {
      this.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
    }

    await sleep(delay);
  }

  this.dispatchEvent(new Event("change", { bubbles: true }));
  return sleep(FEEDBACK_TIMEOUT);
};

const click = HTMLElement.prototype.click;
HTMLElement.prototype.click = async function () {
  await sleep(FEEDBACK_TIMEOUT);
  click.apply(this, arguments);
  return sleep(FEEDBACK_TIMEOUT);
};

sleep(FEEDBACK_TIMEOUT)
  .then(() => runner.run())
  .then((results) => ipc.send("test-results", results));
