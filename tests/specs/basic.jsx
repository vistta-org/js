import { Component } from "@vistta/js";
const INPUT_DEFAULT_VALUE = "Hello";
const INPUT_UPDATE_VALUE = "Hello world";

const tests = {
  "Basic: State Counter": {
    Component: class extends Component {
      counter = 0;
      render() {
        return (
          <>
            <span id="output">{this.counter}</span>
            <button id="increment" onClick={() => this.counter++}>
              increment
            </button>
            <button id="decrement" onClick={() => this.counter--}>
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
  "Basic: State Text": {
    Component: class extends Component {
      defaultValue = INPUT_DEFAULT_VALUE;
      outputValue;
      render() {
        return (
          <>
            <input id="input" value={this.defaultValue} onChange={({ target: { value } }) => (this.outputValue = value)} />
            <span id="output">{this.outputValue || this.defaultValue}</span>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const input = await page.querySelector("#input", { wait: true });
      const output = await page.querySelector("#output", { wait: true });

      equal(await input.evaluate((el) => el.value), INPUT_DEFAULT_VALUE);
      equal(await output.evaluate((el) => el.textContent), INPUT_DEFAULT_VALUE);
      await page.type("#input", INPUT_UPDATE_VALUE, { clear: true });
      equal(await output.evaluate((el) => el.textContent), INPUT_UPDATE_VALUE);
    },
  },
  "Basic: Conditional Render (Without Key)": {
    Component: class extends Component {
      toggle = false;
      render() {
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            {this.toggle && <input id="input" />}
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#toggle", { wait: true });
      const id = "#input";
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      await page.type(id, INPUT_UPDATE_VALUE, { clear: true });
      equal(await (await page.querySelector(id)).evaluate((el) => el.value), INPUT_UPDATE_VALUE);

      await page.click("#toggle");
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      equal(await (await page.querySelector(id)).evaluate((el) => el.value), "");
    },
  },
  "Basic: Conditional Render (With Key)": {
    Component: class extends Component {
      toggle = false;
      render() {
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            {this.toggle && <input id="input" key="input" />}
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#toggle", { wait: true });
      const id = "#input";
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      await page.type(id, INPUT_UPDATE_VALUE, { clear: true });
      equal(await (await page.querySelector(id)).evaluate((el) => el.value), INPUT_UPDATE_VALUE);

      await page.click("#toggle");
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      equal(await (await page.querySelector(id)).evaluate((el) => el.value), INPUT_UPDATE_VALUE);
    },
  },
  "Basic: Render Order (Without Keys)": {
    Component: class extends Component {
      list = [1, 2, 3, 4, 5];

      render() {
        return (
          <>
            <button
              id="sort"
              onClick={() => {
                const reverse = this.list[0] == 1;
                this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
              }}
            >
              sort
            </button>
            <div id="container">
              {this.list.map((value) => (
                <input value={value} />
              ))}
            </div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#sort", { wait: true });
      const lastSelector = "#container > input:last-child";
      let last = await page.querySelector(lastSelector);
      equal(await last.evaluate((el) => el.value), "5");
      await page.type(lastSelector, INPUT_UPDATE_VALUE, { clear: true });
      equal(await last.evaluate((el) => el.value), INPUT_UPDATE_VALUE);
      await page.click("#sort");
      last = await page.querySelector(lastSelector);
      equal(await last.evaluate((el) => el.value), "1");
      await page.click("#sort");
      last = await page.querySelector(lastSelector);
      equal(await last.evaluate((el) => el.value), "5");
    },
  },
  "Basic: Render Order (With Keys)": {
    Component: class extends Component {
      list = [1, 2, 3, 4, 5];

      render() {
        return (
          <>
            <button
              id="sort"
              onClick={() => {
                const reverse = this.list[0] == 1;
                this.list = this.list.toSorted((a, b) => (reverse ? b - a : a - b));
              }}
            >
              sort
            </button>
            <div id="container">
              {this.list.map((value) => (
                <input key={"input-" + value} value={value} />
              ))}
            </div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#sort", { wait: true });
      const firstSelector = "#container > input:first-child";
      let target = await page.querySelector(firstSelector);
      equal(await target.evaluate((el) => el.value), "1");
      await page.type(firstSelector, INPUT_UPDATE_VALUE, { clear: true });
      equal(await target.evaluate((el) => el.value), INPUT_UPDATE_VALUE);

      await page.click("#sort");
      target = await page.querySelector("#container > input:last-child");
      equal(await target.evaluate((el) => el.value), INPUT_UPDATE_VALUE);

      await page.click("#sort");
      target = await page.querySelector(firstSelector);
      equal(await target.evaluate((el) => el.value), INPUT_UPDATE_VALUE);
    },
  },
  "Basic: Single Promise": {
    Component: class extends Component {
      content = new Promise((resolve) => setTimeout(() => resolve(INPUT_UPDATE_VALUE), 100));
      render() {
        return <span id="output">{this.content}</span>;
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "");
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), INPUT_UPDATE_VALUE);
    },
  },
  "Basic: Multiple Promises": {
    Component: class extends Component {
      content1 = new Promise((resolve) => setTimeout(() => resolve(INPUT_UPDATE_VALUE), 100));
      content2 = new Promise((resolve) => setTimeout(() => resolve(INPUT_UPDATE_VALUE), 200));
      render() {
        return (
          <span id="output">
            {this.content1}/{this.content2}
          </span>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "/");
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), INPUT_UPDATE_VALUE + "/");
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), INPUT_UPDATE_VALUE + "/" + INPUT_UPDATE_VALUE);
    },
  },
};

export default tests;
