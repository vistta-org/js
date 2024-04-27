import { Component, Context } from "@vistta/js";

const DEFAULT_TIMEOUT = 500;
const basicContext = new Context("c1", { basic: { counter: 0 } }, "none");
const actionsContext = new Context("c2", { actions: { counter: 0 } }, "none", {
  increment: (prev) => ((prev.actions.counter += 1), prev),
  decrement: (prev) => ((prev.actions.counter -= 1), prev),
});
const cachedContext = new Context("c3", { counter: 0 }, "storage");
const controllerContext = new Context(
  "c4",
  { counter: 0 },
  "none",
  {
    update: (prev) =>
      new Promise((resolve) =>
        setTimeout(() => {
          resolve(((prev.counter += 1), prev));
        }, DEFAULT_TIMEOUT),
      ),
  },
  {
    update: (status, value) => ((value.status = status), console.log(status)),
  },
);

const tests = {
  "Context: Basic": {
    Component: class extends Component {
      context = basicContext();
      render() {
        return (
          <>
            <p id="output">{this.context.basic.counter}</p>
            <button id="increment" onClick={() => this.context.basic.counter++}>
              increment
            </button>
            <button id="decrement" onClick={() => this.context.basic.counter--}>
              decrement
            </button>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#increment");
      equal(await output.evaluate((el) => el.textContent), "1");
      await page.click("#decrement");
      equal(await output.evaluate((el) => el.textContent), "0");
    },
  },
  "Context: Actions": {
    Component: class extends Component {
      context = actionsContext();
      render() {
        return (
          <>
            <p id="output">{this.context.actions.counter}</p>
            <button id="increment" onClick={() => actionsContext.increment()}>
              increment
            </button>
            <button id="decrement" onClick={() => actionsContext.decrement()}>
              decrement
            </button>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#increment");
      equal(await output.evaluate((el) => el.textContent), "1");
      await page.click("#decrement");
      equal(await output.evaluate((el) => el.textContent), "0");
    },
  },
  "Context: Cached": {
    Component: class extends Component {
      context = cachedContext();
      render() {
        return (
          <>
            <p id="output">{this.context.counter}</p>
            <button id="update" onClick={() => this.context.counter++}>
              update
            </button>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      let output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#update");
      equal(await output.evaluate((el) => el.textContent), "1");

      await page.reload();
      output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "1");
      await page.click("#update");
      equal(await output.evaluate((el) => el.textContent), "2");
    },
  },
  "Context: Controller": {
    Component: class extends Component {
      context = controllerContext();
      render() {
        return (
          <>
            <p id="output">{this.context.counter}</p>
            <button id="update" onClick={() => controllerContext.update()}>
              update
            </button>
            <p id="status">{this.context.status}</p>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      const status = await page.querySelector("#status", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      equal(await status.evaluate((el) => el.textContent), "");
      await page.click("#update");
      equal(await output.evaluate((el) => el.textContent), "0");
      equal(await status.evaluate((el) => el.textContent), "pending");
      await page.sleep(DEFAULT_TIMEOUT);
      equal(await output.evaluate((el) => el.textContent), "1");
      equal(await status.evaluate((el) => el.textContent), "completed");
    },
  },
};

export default tests;
