import { Context, Element, Router } from "@vistta/js";
import * as basic from "./components/basic.jsx";
import * as components from "./components/components.jsx";
import { FALLBACK_VALUE, LOADED_VALUE, LOADING_VALUE, TEXT_UPDATE_VALUE, TEXT_VALUE, TIMEOUT } from "./defaults.js";

const TIMEOUT_WITH_DELAY = TIMEOUT * 1.1;

suite("VisttaJS Client Unit Tests", async () => {
  await test("Basic: State Counter", async () => {
    await document.mount(basic.StateCounter);

    expect(document.querySelector("#output").innerText).toEqual("0");
    await document.querySelector("#increment").click();
    expect(document.querySelector("#output").innerText).toEqual("1");
    await document.querySelector("#decrement").click();
    expect(document.querySelector("#output").innerText).toEqual("0");
  });

  await test("Basic: State Text", async () => {
    await document.mount(basic.StateText);
    const input = document.querySelector("#input");
    const output = document.querySelector("#output");

    expect(input.value).toEqual(TEXT_VALUE);
    expect(output.innerText).toEqual(TEXT_VALUE);
    await input.write(TEXT_UPDATE_VALUE, { clear: true });
    expect(output.innerText).toEqual(TEXT_UPDATE_VALUE);
  });

  await test("Basic: Function Component", async () => {
    await document.mount(basic.FunctionalComponent);
    const output = document.querySelector("#output");

    expect(document.querySelector("#input").value).toEqual(TEXT_VALUE);
    expect(output.innerText).toEqual("0");
    await document.querySelector("#increment").click();
    expect(output.innerText).toEqual("1");
    await document.querySelector("#decrement").click();
    expect(output.innerText).toEqual("0");
  });

  await test("Basic: Conditional Render", async () => {
    await document.mount(basic.ConditionalRender);
    const toggle = document.querySelector("#toggle");
    const inputWithoutKey = "#inputWithoutKey";
    const inputWithKey = "#inputWithKey";

    expect(document.querySelector(inputWithoutKey)).toEqual(null);
    expect(document.querySelector(inputWithKey)).toEqual(null);

    await toggle.click();
    await document.querySelector(inputWithoutKey).write(TEXT_UPDATE_VALUE, { clear: true });
    expect(document.querySelector(inputWithoutKey).value).toEqual(TEXT_UPDATE_VALUE);

    await document.querySelector(inputWithKey).write(TEXT_UPDATE_VALUE, { clear: true });
    expect(document.querySelector(inputWithKey).value).toEqual(TEXT_UPDATE_VALUE);

    await toggle.click();
    expect(document.querySelector(inputWithoutKey)).toEqual(null);
    expect(document.querySelector(inputWithKey)).toEqual(null);

    await toggle.click();
    expect(document.querySelector(inputWithoutKey).value).toEqual("");
    expect(document.querySelector(inputWithKey).value).toEqual(TEXT_UPDATE_VALUE);
  });

  await test("Basic: List Render", async () => {
    await document.mount(basic.ListRender);
    const sort = document.querySelector("#sort");

    const firstSelectorWithoutKey = "#containerWithoutKeys > input:first-child";
    const firstSelectorWithKey = "#containerWithKeys > input:first-child";

    expect(document.querySelector(firstSelectorWithoutKey).value).toEqual("1");
    expect(document.querySelector(firstSelectorWithKey).value).toEqual("1");

    await document.querySelector(firstSelectorWithoutKey).write(TEXT_UPDATE_VALUE, { clear: true });
    expect(document.querySelector(firstSelectorWithoutKey).value).toEqual(TEXT_UPDATE_VALUE);
    await document.querySelector(firstSelectorWithKey).write(TEXT_UPDATE_VALUE, { clear: true });
    expect(document.querySelector(firstSelectorWithKey).value).toEqual(TEXT_UPDATE_VALUE);

    await sort.click();
    expect(document.querySelector(firstSelectorWithoutKey).value).toEqual("5");
    expect(document.querySelector(firstSelectorWithKey).value).toEqual("5");

    await sort.click();
    expect(document.querySelector(firstSelectorWithoutKey).value).toEqual("1");
    expect(document.querySelector(firstSelectorWithKey).value).toEqual(TEXT_UPDATE_VALUE);

    await document.querySelector("#removeLast").click();
    expect(document.querySelectorAll("#containerWithKeys > input").length).toEqual(4);
    expect(document.querySelector(firstSelectorWithKey).value).toEqual(TEXT_UPDATE_VALUE);

    await document.querySelector("#addLast").click();
    expect(document.querySelectorAll("#containerWithKeys > input").length).toEqual(5);
    expect(document.querySelector(firstSelectorWithKey).value).toEqual(TEXT_UPDATE_VALUE);
  });

  await test("Basic: Promises", async () => {
    await document.mount(basic.Promises);

    const output = document.querySelector("#output");
    expect(output.innerText).toEqual("/");
    await document.wait(TIMEOUT_WITH_DELAY);
    expect(output.innerText).toEqual(TEXT_UPDATE_VALUE + "/");
    await document.wait(TIMEOUT_WITH_DELAY);
    expect(output.innerText).toEqual(TEXT_UPDATE_VALUE + "/" + TEXT_UPDATE_VALUE);
  });

  await test("Basic: Component Lifecycle", async () => {
    await document.mount(basic.ComponentLifecycle);
    const output = document.querySelector("#output");
    const toggle = document.querySelector("#toggle");

    expect(output.innerText).toEqual("");
    await toggle.click();
    expect(output.innerText).toEqual("connected");
    await toggle.click();
    expect(output.innerText).toEqual("disconnected");
    await toggle.click();
    expect(output.innerText).toEqual("connected");
    await toggle.click();
    expect(output.innerText).toEqual("disconnected");
  });

  await test("Basic: Component Children Update", async () => {
    await document.mount(basic.ComponentChildrenUpdate);
    const count = document.querySelector("#count");
    const toggle = document.querySelector("#toggle");
    const increment = document.querySelector("#increment");

    expect(count.innerText).toEqual("1");
    expect(document.querySelector("#display")).toEqual(null);

    await toggle.click();
    expect(document.querySelector("#content").innerText).toEqual("1");

    await increment.click();
    expect(count.innerText).toEqual("2");
    expect(document.querySelector("#content").innerText).toEqual("2");

    await toggle.click();
    expect(document.querySelector("#display")).toEqual(null);

    await increment.click();
    await toggle.click();
    expect(count.innerText).toEqual("3");
    expect(document.querySelector("#content").innerText).toEqual("3");
  });

  await test("Basic: Computed Getters", async () => {
    await document.mount(basic.ComputedGetters);
    const filtered = document.querySelector("#filtered");
    const filteredLength = document.querySelector("#filtered-length");
    const computeCount = document.querySelector("#compute-count");

    expect(filtered.innerText).toEqual("123");
    expect(filteredLength.innerText).toEqual("3");
    expect(computeCount.innerText).toEqual("1");

    await document.querySelector("#increment").click();
    expect(filtered.innerText).toEqual("1234");
    expect(filteredLength.innerText).toEqual("4");
    expect(computeCount.innerText).toEqual("2");

    await document.querySelector("#increment").click();
    expect(filtered.innerText).toEqual("12345");
    expect(filteredLength.innerText).toEqual("5");
    expect(computeCount.innerText).toEqual("3");

    await document.querySelector("#increment").click();
    expect(filtered.innerText).toEqual("12345");
    expect(filteredLength.innerText).toEqual("5");
    expect(computeCount.innerText).toEqual("4");

    await document.querySelector("#decrement").click();
    expect(filtered.innerText).toEqual("12345");
    expect(filteredLength.innerText).toEqual("5");
    expect(computeCount.innerText).toEqual("5");

    // Setting same value should not trigger recompute
    await document.querySelector("#noop").click();
    expect(filtered.innerText).toEqual("12345");
    expect(filteredLength.innerText).toEqual("5");
    expect(computeCount.innerText).toEqual("5");
  });

  await test("Basic: Computed Dependency Tracking", async () => {
    await document.mount(basic.ComputedDependencyTracking);
    const filtered = document.querySelector("#filtered");
    const total = document.querySelector("#total");

    // Initial: items 1-5, multiplier 1 => sum = 15
    expect(filtered.innerText).toEqual("5");
    expect(total.innerText).toEqual("15");

    // Increase filter to 6 => items 1-6, sum = 21
    await document.querySelector("#increment-filter").click();
    expect(filtered.innerText).toEqual("6");
    expect(total.innerText).toEqual("21");

    // Increase multiplier to 2 => sum = 21 * 2 = 42
    await document.querySelector("#increment-multiplier").click();
    expect(filtered.innerText).toEqual("6");
    expect(total.innerText).toEqual("42");
  });

  await test("Basic: Computed Getters Per Instance", async () => {
    await document.mount(basic.ComputedInstances);
    const first = document.querySelector("#first");
    const second = document.querySelector("#second");

    expect(first.innerText).toEqual("2");
    expect(second.innerText).toEqual("200");
    await document.querySelector("#increment").click();
    expect(first.innerText).toEqual("4");
    expect(second.innerText).toEqual("200");
  });

  await test("Mutation: Computed Args", async () => {
    await document.mount(basic.ComputedMutation);
    const greeting = document.querySelector("#greeting");
    const derived = document.querySelector("#derived");

    expect(greeting.innerText).toEqual("Hello");
    expect(derived.innerText).toEqual("HELLO");

    await document.querySelector("#lang-pt").click();
    expect(greeting.innerText).toEqual("Olá");
    expect(derived.innerText).toEqual("OLÁ");

    await document.querySelector("#lang-en").click();
    expect(greeting.innerText).toEqual("Hello");
    expect(derived.innerText).toEqual("HELLO");
  });

  await test("Mutation: Computed Lifecycle", async () => {
    await document.mount(basic.ComputedLifecycle);
    const toggle = document.querySelector("#toggle");
    const bump = document.querySelector("#bump");

    // Laziness: with no readers, .update() must not evaluate the factory.
    await bump.click();
    expect(basic.getComputedSourceCalls()).toEqual(0);

    await toggle.click();
    let output = document.querySelector("#output");
    expect(output.innerText).toEqual("1");
    expect(basic.getComputedSourceCalls()).toEqual(1);

    await bump.click();
    expect(output.innerText).toEqual("2");

    // Unmount the reader.
    await toggle.click();
    expect(document.querySelector("#output")).toEqual(null);

    // Unsubscribed: .update() must not evaluate the factory.
    await bump.click();
    expect(basic.getComputedSourceCalls()).toEqual(2);

    // Re-mount (keyed reuse): nodes are restored as-is, subscription re-enabled.
    await toggle.click();
    output = document.querySelector("#output");
    expect(output.innerText).toEqual("2");

    await bump.click();
    expect(output.innerText).toEqual("3");
    expect(basic.getComputedSourceCalls()).toEqual(3);
  });

  await test("Mutation: Computed Raw Render", async () => {
    await document.mount(basic.ComputedRawRender);
    const raw = document.querySelector("#raw");
    const wrapped = document.querySelector("#wrapped");

    expect(raw.innerText).toEqual(TEXT_VALUE);
    expect(wrapped.innerText).toEqual(TEXT_VALUE);

    await document.querySelector("#refresh").click();
    expect(raw.innerText).toEqual(TEXT_UPDATE_VALUE);
    expect(wrapped.innerText).toEqual(TEXT_UPDATE_VALUE);
  });

  await test("Basic: Ref", async () => {
    await document.mount(basic.RefExample);

    expect(document.querySelector("#input").value).toEqual(TEXT_UPDATE_VALUE);
    expect(document.querySelector("#output").value).toEqual("");
    await document.querySelector("#update").click();
    expect(document.querySelector("#output").value).toEqual(TEXT_UPDATE_VALUE);
  });

  await test("Basic: Context Basic", async () => {
    await document.mount(basic.ContextBasic);
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual("0");
    await document.querySelector("#increment").click();
    expect(output.innerText).toEqual("1");
    await document.querySelector("#decrement").click();
    expect(output.innerText).toEqual("0");
  });

  await test("Basic: Context Actions", async () => {
    await document.mount(basic.ContextActions);
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual("0");
    await document.querySelector("#increment").click();
    expect(output.innerText).toEqual("1");
    await document.querySelector("#decrement").click();
    expect(output.innerText).toEqual("0");
  });

  await test("Basic: Context Cached", async () => {
    sessionStorage.removeItem("context_cached_test");
    await document.mount(basic.ContextCached);
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual("0");
    await document.querySelector("#increment").click();
    expect(output.innerText).toEqual("1");
    await document.querySelector("#increment").click();
    expect(output.innerText).toEqual("2");

    // Wait for debounced cache write
    await document.wait(150);

    // Remount — cached value should persist
    await document.mount(basic.ContextCached);
    expect(document.querySelector("#output").innerText).toEqual("2");
  });

  await test("Components: Render.If", async () => {
    await document.mount(components.RenderIf);
    const toggle = document.querySelector("#toggle");

    expect(document.querySelector("#output")).toEqual(null);
    await toggle.click();
    expect(document.querySelector("#output").innerText).toEqual(TEXT_UPDATE_VALUE);
    await toggle.click();
    expect(document.querySelector("#output")).toEqual(null);
  });

  await test("Components: Render.Each", async () => {
    await document.mount(components.RenderEach);
    const toggle = document.querySelector("#toggle");

    expect(document.querySelector("#list > input:first-child").value).toEqual("1");
    expect(document.querySelector("#list > input:last-child").value).toEqual("5");
    expect(document.querySelector("#object > input:first-child").value).toEqual("1: " + TEXT_UPDATE_VALUE[1]);
    expect(document.querySelector("#object > input:last-child").value).toEqual("5: " + TEXT_UPDATE_VALUE[5]);

    await toggle.click();
    expect(document.querySelector("#list > input:first-child").value).toEqual("5");
    expect(document.querySelector("#list > input:last-child").value).toEqual("1");
    expect(document.querySelector("#object > input:first-child").value).toEqual("1: " + TEXT_UPDATE_VALUE[5]);
    expect(document.querySelector("#object > input:last-child").value).toEqual("5: " + TEXT_UPDATE_VALUE[1]);

    await toggle.click();
    expect(document.querySelector("#list > input:first-child").value).toEqual("1");
    expect(document.querySelector("#list > input:last-child").value).toEqual("5");
    expect(document.querySelector("#object > input:first-child").value).toEqual("1: " + TEXT_UPDATE_VALUE[1]);
    expect(document.querySelector("#object > input:last-child").value).toEqual("5: " + TEXT_UPDATE_VALUE[5]);
  });

  await test("Components: Safe", async () => {
    await document.mount(components.SafeExample);

    expect(document.querySelector("#output").innerText).toEqual(TEXT_VALUE);
    await document.querySelector("#increment").click();
    expect(document.querySelector("#output").innerText).toEqual(FALLBACK_VALUE);
    await document.querySelector("#increment").click();
    expect(document.querySelector("#output").innerText).toEqual(FALLBACK_VALUE);

    await document.querySelector("#toggle").click();
    expect(document.querySelector("#output").innerText).toEqual("");
    await document.querySelector("#toggle").click();
    expect(document.querySelector("#output").innerText).toEqual(TEXT_VALUE);
  });

  await test("Components: Suspense Basic", async () => {
    await document.mount(components.SuspenseBasic);
    expect(document.querySelector("#output").innerText).toEqual(LOADED_VALUE);
  });

  await test("Components: Suspense Promises", async () => {
    await document.mount(components.SuspensePromises);
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY);
    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY);
    expect(output.innerText).toEqual(LOADED_VALUE + "/" + LOADED_VALUE);
  });

  await test("Components: Suspense Toggle", async () => {
    await document.mount(components.SuspenseToggle);
    const output = document.querySelector("#output");
    const increment = document.querySelector("#increment");

    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY);
    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY * 4);
    expect(output.innerText).toEqual(LOADED_VALUE + "/" + LOADED_VALUE);

    await increment.click();
    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY * 2);
    expect(output.innerText).toEqual(LOADING_VALUE);
    await document.wait(TIMEOUT_WITH_DELAY * 2);
    expect(output.innerText).toEqual(LOADED_VALUE + "/" + LOADED_VALUE);
  });

  await test("Components: Form Basic", async () => {
    await document.mount(components.FormBasic);
    const input = document.querySelector("#input");
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual("");
    await input.write("hello@world.com", { clear: true });
    await document.querySelector("#submit").click();
    expect(output.innerText).toEqual("hello@world.com");
  });

  await test("Components: Form Context", async () => {
    await document.mount(components.FormContext);
    const input = document.querySelector("#input");
    const output = document.querySelector("#output");

    expect(output.innerText).toEqual("");
    await input.write("hello");
    expect(output.innerText).toEqual("hello");
    await input.write(" world");
    expect(output.innerText).toEqual("hello world");
  });

  await test("Components: Form Validation", async () => {
    await document.mount(components.FormValidation);
    const output = document.querySelector("#output");

    await document.querySelector("#submit").click();
    expect(output.innerText).toEqual("");

    await document.querySelector("#name").write("name", { clear: true });
    await document.querySelector("#submit").click();
    expect(output.innerText).toEqual("invalid");

    await document.querySelector("#email").write("email@mail.com", { clear: true });
    await document.querySelector("#submit").click();
    expect(output.innerText).toEqual("invalid");

    await document.querySelector("#password").write("987654321", { clear: true });
    await document.querySelector("#submit").click();
    expect(output.innerText).toEqual("valid");
  });

  await test("Style: Dimensions", async () => {
    await document.mount(() => ({
      render: () => new Element("div", { id: "target", style: { width: "120px", height: "80px" } }),
    }));
    const target = document.querySelector("#target").getBoundingClientRect();
    expect(target.width).toEqual(120);
    expect(target.height).toEqual(80);
  });

  await test("Router: Events", async () => {
    const values = [];
    const listener = (event) => values.push(event.detail);
    Router.on("fixture-event", listener);
    Router.emit("fixture-event", "first");
    Router.off("fixture-event", listener);
    Router.emit("fixture-event", "second");
    expect(values.join(",")).toEqual("first");
    expect(Router.location.pathname).toEqual(window.location.pathname);
  });

  await test("Context: Async Action Status", async () => {
    let complete;
    const context = new Context(
      "async_status_test",
      { counter: 0 },
      {
        actions: {
          increment: (prev) =>
            new Promise((resolve) => {
              complete = () => resolve({ counter: prev.counter + 1 });
            }),
        },
      },
    );
    const statuses = [];
    const unsubscribe = context.on("increment", (status) => statuses.push(status));
    const action = context.increment();
    expect(statuses.join(",")).toEqual("pending");
    expect(context.value.counter).toEqual(0);
    complete();
    await action;
    expect(context.value.counter).toEqual(1);
    expect(statuses.join(",")).toEqual("pending,completed");
    unsubscribe();
  });
});
