import { Component, route } from "@vistta/js";
const DEFAULT_PATHNAME = "/" + encodeURIComponent("Router: Location");

const tests = {
  "Router: Location": {
    Component: class extends Component {
      render() {
        return <div id="output">{route.location.pathname}</div>;
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), DEFAULT_PATHNAME);
    },
  },
  "Router: Navigation": {
    Component: class extends Component {
      render() {
        return (
          <button
            id="navigate"
            onClick={() => route.navigate(DEFAULT_PATHNAME)}
          >
            navigate
          </button>
        );
      }
    },
    test: async (page, { equal }) => {
      await page.querySelector("#navigate", { wait: true });

      equal(
        (await page.location()).pathname,
        "/" + encodeURIComponent("Router: Navigation"),
      );

      await page.click("#navigate");
      equal((await page.location()).pathname, DEFAULT_PATHNAME);
    },
  },
  "Router: Refresh": {
    Component: class extends Component {
      counter = 0;
      render() {
        return (
          <>
            <button id="refresh" onClick={() => route.refresh()}>
              refresh
            </button>
            <button id="update" onClick={() => this.counter++}>
              update
            </button>
            <div id="output">{this.counter}</div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      let output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#update");
      equal(await output.evaluate((el) => el.textContent), "1");

      await page.click("#refresh");
      await page.sleep(100);
      output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
    },
  },
  "Router: Events": {
    Component: class extends Component {
      globalCounter = 0;
      onConnect() {
        route.on("increment", () => this.globalCounter++);
      }

      render() {
        return (
          <>
            <button id="update" onClick={() => route.emit("increment")}>
              update
            </button>
            <div id="output">{this.globalCounter}</div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      let output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#update");
      equal(await output.evaluate((el) => el.textContent), "1");
    },
  },
};

export default tests;
