import { Component, Context } from "@vistta/js";

const counter = new Context("counter", 0, "none", {
  increment: (prev) => prev + 1,
  decrement: (prev) => prev - 1,
});

const tests = {
  "Context: Counter": {
    Component: class extends Component {
      counter = counter();
      render() {
        return (
          <>
            <span id="output">{this.counter}</span>
            <button id="increment" onClick={() => counter.increment()}>
              increment
            </button>
            <button id="decrement" onClick={() => counter.decrement()}>
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
};

export default tests;
