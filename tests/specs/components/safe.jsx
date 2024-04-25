import { Component, Safe } from "@vistta/js";

const DEFAULT_FALLBACK = "Fallback";
const DEFAULT_OUTPUT = "Hello World";
class ErrorComponent extends Component {
  render() {
    throw new Error("Dummy Error");
  }
}

const tests = {
  "Safe: Success": {
    Component: class extends Component {
      render() {
        return (
          <div id="output">
            <Safe fallback={DEFAULT_FALLBACK}>{DEFAULT_OUTPUT}</Safe>
          </div>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), DEFAULT_OUTPUT);
    },
  },
  "Safe: Fail": {
    Component: class extends Component {
      render() {
        return (
          <div id="output">
            <Safe fallback={DEFAULT_FALLBACK}>
              <ErrorComponent />
            </Safe>
          </div>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), DEFAULT_FALLBACK);
    },
  },
};

export default tests;
