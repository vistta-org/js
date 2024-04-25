import { Component, Suspense } from "@vistta/js";

const LOADING_DEFAULT_VALUE = "loading";
const LOADED_DEFAULT_VALUE = "loaded";

const tests = {
  "Component: Suspense: No Promises": {
    Component: class extends Component {
      render() {
        return (
          <span id="output">
            <Suspense fallback={LOADING_DEFAULT_VALUE}>{LOADED_DEFAULT_VALUE}</Suspense>
          </span>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE);
    },
  },
  "Component: Suspense: Single Promise": {
    Component: class extends Component {
      content = new Promise((resolve) => setTimeout(() => resolve(LOADED_DEFAULT_VALUE), 100));
      render() {
        return (
          <span id="output">
            <Suspense fallback={LOADING_DEFAULT_VALUE}>{this.content}</Suspense>
          </span>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), LOADING_DEFAULT_VALUE);
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE);
    },
  },
  "Component: Suspense: Multiple Promises": {
    Component: class extends Component {
      content1 = new Promise((resolve) => setTimeout(() => resolve(LOADED_DEFAULT_VALUE), 100));
      content2 = new Promise((resolve) => setTimeout(() => resolve(LOADED_DEFAULT_VALUE), 200));
      render() {
        return (
          <span id="output">
            <Suspense fallback={LOADING_DEFAULT_VALUE}>
              {this.content1}/{this.content2}
            </Suspense>
          </span>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), LOADING_DEFAULT_VALUE);
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), LOADING_DEFAULT_VALUE);
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE + "/" + LOADED_DEFAULT_VALUE);
    },
  },
  "Component: Suspense: Toggle": {
    Component: class extends Component {
      toggle = true;
      content = new Promise((resolve) => setTimeout(() => resolve(LOADED_DEFAULT_VALUE), 100));
      render() {
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            <span id="output">{this.toggle && <Suspense fallback={LOADING_DEFAULT_VALUE}>{this.content}</Suspense>}</span>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), LOADING_DEFAULT_VALUE);
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE);
      await page.click("#toggle");
      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE);
      await page.click("#toggle");
      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), LOADED_DEFAULT_VALUE);
    },
  },
};

export default tests;
