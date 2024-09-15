import { Component, Render } from "@vistta/js";
const DEFAULT_OUTPUT = "Hello World";

const tests = {
  "Component: Render If: Conditional": {
    Component: class extends Component {
      toggle = false;
      render() {
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            <Render.If condition={this.toggle}>
              <div id="output">{DEFAULT_OUTPUT}</div>
            </Render.If>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#toggle", { wait: true });
      const id = "#output";
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      equal(
        await (
          await page.querySelector("#output", { wait: true })
        ).evaluate((el) => el.textContent),
        DEFAULT_OUTPUT,
      );
    },
  },
  "Component: Render Each: List": {
    Component: class extends Component {
      list = [1, 2, 3, 4, 5];

      render() {
        return (
          <div id="container">
            <Render.Each
              target={this.list}
              callback={(value) => <input value={value} />}
            />
          </div>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#container", { wait: true });
      equal(
        await (
          await page.querySelector("#container > input:first-child")
        ).evaluate((el) => el.value),
        "1",
      );
      equal(
        await (
          await page.querySelector("#container > input:last-child")
        ).evaluate((el) => el.value),
        "5",
      );
    },
  },
  "Component: Render Each: Object": {
    Component: class extends Component {
      object = { one: 1, two: 2, three: 3, four: 4, five: 5 };

      render() {
        return (
          <div id="container">
            <Render.Each
              target={this.object}
              callback={(v, k) => <input value={`${k}: ${v}`} />}
            />
          </div>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#container", { wait: true });
      equal(
        await (
          await page.querySelector("#container > input:first-child")
        ).evaluate((el) => el.value),
        "one: 1",
      );
      equal(
        await (
          await page.querySelector("#container > input:last-child")
        ).evaluate((el) => el.value),
        "five: 5",
      );
    },
  },
};

export default tests;
