import * as basic from "./components/basic.jsx";
import { TEXT_UPDATE_VALUE, TEXT_VALUE, TIMEOUT } from "./defaults.js";

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

  /*test("Style", async () => {
    const page = await browser.mount("./components/style.jsx");
    const target = await (await page.get("#target", { wait: true })).boundingBox();
    expect(target.height).toEqual(SIZE);
    expect(target.width).toEqual(SIZE);
  });

  test("Router", async () => {
    const page = await browser.mount("./components/router.jsx");
    const output = "#output";

    expect(await page.get(output, "innerText")).toEqual((await page.location()).pathname);
    await page.click("#update");
    expect(await page.get(output, "innerText")).toEqual("1");
    await page.click("#refresh");
    expect(await page.get(output, "innerText")).toEqual((await page.location()).pathname);
    await page.click("#update");
    expect(await page.get(output, "innerText")).toEqual("1");
    await page.click("#navigate");
    expect(await page.url()).toEqual(URL);
  });

  test("Ref", async () => {
    const page = await browser.mount("./components/ref.jsx");

    expect(await page.get("#input", "value")).toEqual(TEXT_UPDATE_VALUE);

    const output = await page.get("#output", { wait: true });
    expect(await output.get("value")).toEqual("");
    await page.click("#update");
    expect(await output.get("value")).toEqual(TEXT_UPDATE_VALUE);
  });

  test("Context: Basic", async () => {
    const page = await browser.mount("./components/context/basic.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual("0");
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual("1");
    await page.click("#decrement");
    expect(await output.get("innerText")).toEqual("0");
    await page.click("#increment");
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual("2");
  });

  test("Context: Actions", async () => {
    const page = await browser.mount("./components/context/actions.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual("0");
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual("1");
    await page.click("#decrement");
    expect(await output.get("innerText")).toEqual("0");
    await page.click("#increment");
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual("2");
  });

  test("Context: Cached", async () => {
    const page = await browser.mount("./components/context/cached.jsx");
    let output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual("0");
    await page.click("#update");
    expect(await output.get("innerText")).toEqual("1");

    await page.reload();
    output = await page.get("#output", { wait: true });
    expect(await output.get("innerText")).toEqual("1");
    await page.click("#update");
    expect(await output.get("innerText")).toEqual("2");
  });

  test("Context: Controller", async () => {
    const page = await browser.mount("./components/context/controller.jsx");
    const output = await page.get("#output", { wait: true });
    const status = await page.get("#status", { wait: true });

    expect(await output.get("innerText")).toEqual("0");
    expect(await status.get("innerText")).toEqual("");
    await page.click("#update");
    expect(await output.get("innerText")).toEqual("0");
    expect(await status.get("innerText")).toEqual("pending");
    await page.wait(TIMEOUT);
    expect(await output.get("innerText")).toEqual("1");
    expect(await status.get("innerText")).toEqual("completed");
  });

  test("Suspense: No Promises", async () => {
    const page = await browser.mount("./components/suspense/basic.jsx");
    const output = await page.get("#output", { wait: true });
    expect(await output.get("innerText")).toEqual(LOADED_VALUE);
  });

  test("Suspense: Promises", async () => {
    const page = await browser.mount("./components/suspense/promises.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual(LOADING_VALUE);
    await page.wait(TIMEOUT_WITH_DELAY);
    expect(await output.get("innerText")).toEqual(LOADING_VALUE);
    await page.wait(TIMEOUT_WITH_DELAY);
    expect(await output.get("innerText")).toEqual(LOADED_VALUE + "/" + LOADED_VALUE);
  });

  test("Suspense: Toggle", async () => {
    const page = await browser.mount("./components/suspense/toggle.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual(LOADING_VALUE);
    await page.wait(TIMEOUT_WITH_DELAY);
    expect(await output.get("innerText")).toEqual(LOADED_VALUE);
    await page.click("#toggle");
    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual(LOADED_VALUE);
    await page.click("#toggle");
    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual(LOADED_VALUE);
  });

  test("Safe", async () => {
    const page = await browser.mount("./components/safe.jsx");
    const output = await page.get("#output", { wait: true });
    const counter = await page.get("#counter", { wait: true });

    expect(await output.get("innerText")).toEqual(TEXT_VALUE);
    expect(await counter.get("innerText")).toEqual("0");
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual(TEXT_VALUE);
    expect(await counter.get("innerText")).toEqual("1");

    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual("");
    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual(FALLBACK_VALUE);
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual(FALLBACK_VALUE);
    expect(await counter.get("innerText")).toEqual("2");

    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual("");
    await page.click("#toggle");
    expect(await output.get("innerText")).toEqual(TEXT_VALUE);
    await page.click("#increment");
    expect(await output.get("innerText")).toEqual(TEXT_VALUE);
    expect(await counter.get("innerText")).toEqual("3");
  });

  test("Render.If", async () => {
    const page = await browser.mount("./components/render/if.jsx");
    await page.get("#toggle", { wait: true });

    expect(await page.get("#output")).toEqual(null);
    await page.click("#toggle");
    expect(await page.get("#output", "innerText")).toEqual(TEXT_UPDATE_VALUE);
    await page.click("#toggle");
    expect(await page.get("#output")).toEqual(null);
  });

  test("Render.Each", async () => {
    const page = await browser.mount("./components/render/each.jsx");
    await page.get("#toggle", { wait: true });

    expect(await page.get("#list > input:first-child", "value")).toEqual("1");
    expect(await page.get("#list > input:last-child", "value")).toEqual("5");
    expect(await page.get("#object > input:first-child", "value")).toEqual("1: " + TEXT_UPDATE_VALUE[1]);
    expect(await page.get("#object > input:last-child", "value")).toEqual("5: " + TEXT_UPDATE_VALUE[5]);
    await page.click("#toggle");
    expect(await page.get("#list > input:first-child", "value")).toEqual("5");
    expect(await page.get("#list > input:last-child", "value")).toEqual("1");
    expect(await page.get("#object > input:first-child", "value")).toEqual("1: " + TEXT_UPDATE_VALUE[5]);
    expect(await page.get("#object > input:last-child", "value")).toEqual("5: " + TEXT_UPDATE_VALUE[1]);
    await page.click("#toggle");
    expect(await page.get("#list > input:first-child", "value")).toEqual("1");
    expect(await page.get("#list > input:last-child", "value")).toEqual("5");
    expect(await page.get("#object > input:first-child", "value")).toEqual("1: " + TEXT_UPDATE_VALUE[1]);
    expect(await page.get("#object > input:last-child", "value")).toEqual("5: " + TEXT_UPDATE_VALUE[5]);
  });

  test("Profiler", async () => {
    const page = await browser.mount("./components/profiler.jsx");
    const output = await page.get("#output", { wait: true });

    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
    await page.click("#update");
    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
    await page.click("#update");
    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
  });

  test("Form: Basic", async () => {
    const page = await browser.mount("./components/form/basic.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual("");
    const email = "hello@world.com";
    await page.type("#input", email, { clear: true, submit: false });
    await page.click("#submit");
    expect(await output.get("innerText")).toEqual(email);
  });

  test("Form: Actions", async () => {
    const page = await browser.mount("./components/form/actions.jsx");
    const output = await page.get("#output", { wait: true });
    expect(await output.get("innerText")).toEqual("0");

    await page.click("#toggle");
    await page.press("#input", "ArrowUp");
    expect(await output.get("innerText")).toEqual("0");
    await page.click("#values");
    expect(await page.get("#value", "innerText")).toEqual("1");

    await page.click("#watch");
    await page.press("#input", "ArrowUp");
    expect(await output.get("innerText")).toEqual("2");
    await page.click("#unwatch");
    await page.press("#input", "ArrowUp");
    expect(await output.get("innerText")).toEqual("2");

    await page.click("#clear");
    expect(await output.get("innerText")).toEqual("2");
    await page.click("#reset");
    expect(await output.get("innerText")).toEqual("2");

    await page.click("#watch");
    await page.press("#input", "ArrowUp");
    expect(await output.get("innerText")).toEqual("1");
    await page.click("#clear");
    expect(await output.get("innerText")).toEqual("");
    await page.click("#reset");
    expect(await output.get("innerText")).toEqual("0");

    await page.click("#validate");
    expect(await page.get("#validation", "innerText")).toEqual("valid");

    await page.press("#input", "ArrowUp");
    const submitted = await page.get("#submitted", { wait: true });
    expect(await submitted.get("innerText")).toEqual("");
    await page.click("#submit");
    expect(await submitted.get("innerText")).toEqual("1");
  });

  test("Form: Validation", async () => {
    const page = await browser.mount("./components/form/validation.jsx");
    const output = await page.get("#output", { wait: true });
    expect(await output.get("innerText")).toEqual("");

    await page.click("#submit");
    expect(await output.get("innerText")).toEqual("");

    await page.type("#name", "name");
    await page.click("#submit");
    expect(await output.get("innerText")).toEqual("invalid");

    await page.type("#email", "email@mail.com");
    await page.click("#submit");
    expect(await output.get("innerText")).toEqual("invalid");

    await page.type("#password", "987654321");
    await page.click("#submit");
    expect(await output.get("innerText")).toEqual("valid");
  });*/
});
