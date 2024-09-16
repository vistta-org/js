import { TIMEOUT, TEXT_VALUE, TEXT_UPDATE_VALUE, FALLBACK_VALUE, LOADING_VALUE, LOADED_VALUE, SIZE } from "./defaults.js";

const TIMEOUT_WITH_DELAY = TIMEOUT * 1.1;

suite("VisttaJS Client Unit Tests", async () => {
  test("Basic: State Counter", async () => {
    const page = await browser.mount("./components/basic/stateCounter.jsx");
    const output = await page.get("#output", { wait: true });

    expect(await output.get("innerText")).toEqual("0");
    await (await page.get("#increment")).click();
    expect(await output.get("innerText")).toEqual("1");
    await (await page.get("#decrement")).click();
    expect(await output.get("innerText")).toEqual("0");
  });

  test("Basic: State Text", async () => {
    const page = await browser.mount("./components/basic/stateText.jsx");
    const input = await page.get("#input", { wait: true });
    const output = await page.get("#output", { wait: true });

    expect(await input.get("value")).toEqual(TEXT_VALUE);
    expect(await output.get("innerText")).toEqual(TEXT_VALUE);
    await input.type(TEXT_UPDATE_VALUE, { clear: true });
    expect(await output.get("innerText")).toEqual(TEXT_UPDATE_VALUE);
  });

  test("Basic: Conditional Render", async () => {
    const page = await browser.mount("./components/basic/conditionalRender.jsx");
    const toggle = await page.get("#toggle", { wait: true });
    const inputWithoutKey = "#inputWithoutKey";
    const inputWithKey = "#inputWithKey";

    expect(await page.get(inputWithoutKey)).toEqual(null);
    expect(await page.get(inputWithKey)).toEqual(null);

    await toggle.click();
    await page.type(inputWithoutKey, TEXT_UPDATE_VALUE, { clear: true });
    expect(await page.get(inputWithoutKey, "value")).toEqual(TEXT_UPDATE_VALUE);

    await page.type(inputWithKey, TEXT_UPDATE_VALUE, { clear: true });
    expect(await page.get(inputWithKey, "value")).toEqual(TEXT_UPDATE_VALUE);

    await toggle.click();
    expect(await page.get(inputWithoutKey)).toEqual(null);
    expect(await page.get(inputWithKey)).toEqual(null);

    await toggle.click();
    expect(await page.get(inputWithoutKey, "value")).toEqual("");
    expect(await page.get(inputWithKey, "value")).toEqual(TEXT_UPDATE_VALUE);
  });

  test("Basic: List Render", async () => {
    const page = await browser.mount("./components/basic/listRender.jsx");
    const sort = await page.get("#sort", { wait: true });

    const firstSelectorWithoutKey = "#containerWithoutKeys > input:first-child";
    const firstSelectorWithKey = "#containerWithKeys > input:first-child";

    expect(await page.get(firstSelectorWithoutKey, "value")).toEqual("1");
    expect(await page.get(firstSelectorWithKey, "value")).toEqual("1");

    await page.type(firstSelectorWithoutKey, TEXT_UPDATE_VALUE, { clear: true });
    expect(await page.get(firstSelectorWithoutKey, "value")).toEqual(TEXT_UPDATE_VALUE);
    await page.type(firstSelectorWithKey, TEXT_UPDATE_VALUE, { clear: true });
    expect(await page.get(firstSelectorWithKey, "value")).toEqual(TEXT_UPDATE_VALUE);

    await sort.click();
    expect(await page.get(firstSelectorWithoutKey, "value")).toEqual("5");
    expect(await page.get(firstSelectorWithKey, "value")).toEqual("5");

    await sort.click();
    expect(await page.get(firstSelectorWithoutKey, "value")).toEqual("1");
    expect(await page.get(firstSelectorWithKey, "value")).toEqual(TEXT_UPDATE_VALUE);
  });

  test("Basic: Promises", async () => {
    const page = await browser.mount("./components/basic/promises.jsx");

    const output = await page.get("#output", { wait: true });
    expect(await output.get("innerText")).toEqual("/");
    await page.wait(TIMEOUT_WITH_DELAY);
    expect(await output.get("innerText")).toEqual(TEXT_UPDATE_VALUE + "/");
    await page.wait(TIMEOUT_WITH_DELAY);
    expect(await output.get("innerText")).toEqual(TEXT_UPDATE_VALUE + "/" + TEXT_UPDATE_VALUE);
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

  test("Profiler", async () => {
    const page = await browser.mount("./components/profiler.jsx");
    const output = await page.get("#output", { wait: true });

    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
    await page.click("#update");
    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
    await page.click("#update");
    expect(parseFloat(await output.get("innerText")) > 0).toEqual(true);
  });

  test("Style", async () => {
    const page = await browser.mount("./components/style.jsx");
    const target = await (await page.get("#target", { wait: true })).boundingBox();
    expect(target.height).toEqual(SIZE);
    expect(target.width).toEqual(SIZE);
  });
});