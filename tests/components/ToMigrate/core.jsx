import { Component } from "@vistta/js";

const DEFAULT_OUTPUT = "Hello world";

class BasicComponent extends Component {
  render() {
    return <div id="output">{DEFAULT_OUTPUT}</div>;
  }
}

const BasicFunction = () => ({
  render() {
    return <div id="output">{DEFAULT_OUTPUT}</div>;
  },
});

class InnerComponent extends Component {
  counter = 0;
  render() {
    return (
      <>
        <button id="increment" onClick={() => this.counter++}>
          increment
        </button>
        <div id="output">{this.counter}</div>
      </>
    );
  }
}

const tests = {
  "Component: Basic Class": {
    Component: class extends Component {
      render() {
        return <BasicComponent />;
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), DEFAULT_OUTPUT);
    },
  },
  "Component: Basic Function": {
    Component: class extends Component {
      render() {
        return <BasicFunction />;
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), DEFAULT_OUTPUT);
    },
  },
  "Component: Conditional": {
    Component: class extends Component {
      toggle = false;
      render() {
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            {this.toggle && <InnerComponent />}
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
        "0",
      );

      await page.click("#increment");
      equal(
        await (
          await page.querySelector("#output", { wait: true })
        ).evaluate((el) => el.textContent),
        "1",
      );

      await page.click("#toggle");
      equal(await page.querySelector(id), null);

      await page.click("#toggle");
      equal(
        await (
          await page.querySelector("#output", { wait: true })
        ).evaluate((el) => el.textContent),
        "0",
      );
    },
  },
  "Component: Lifecycle": {
    Component: class extends Component {
      toggle = false;
      output;
      render() {
        const root = this;
        return (
          <>
            <button id="toggle" onClick={() => (this.toggle = !this.toggle)}>
              toggle
            </button>
            <p id="output">{this.output}</p>
            {this.toggle &&
              (() => ({
                onConnect() {
                  root.output = "connected";
                },
                onDisconnect() {
                  root.output = "disconnected";
                },
                render() {
                  return <p></p>;
                },
              }))}
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "");

      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), "connected");

      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), "disconnected");

      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), "connected");

      await page.click("#toggle");
      equal(await output.evaluate((el) => el.textContent), "disconnected");
    },
  },
};

export default tests;
