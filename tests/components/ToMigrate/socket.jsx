import { Component, socket } from "@vistta/js";

const tests = {
  Socket: {
    Component: class extends Component {
      output;
      onConnect() {
        socket.on("pong", (output) => (this.output = output));
      }

      render() {
        return (
          <>
            <button id="ping" onClick={() => socket.emit("ping")}>
              ping
            </button>
            <div id="output">{this.output}</div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.textContent), "");
      await page.click("#ping");
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), "0");
      await page.click("#ping");
      await page.sleep(100);
      equal(await output.evaluate((el) => el.textContent), "1");
    },
  },
};

export default tests;
