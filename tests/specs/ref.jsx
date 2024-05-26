import { Component, Ref } from "@vistta/js";
const INPUT_UPDATE_VALUE = "Hello world";

const tests = {
  "Ref: Function Ref": {
    Component: class extends Component {
      render() {
        return (
          <input id="output" ref={(e) => (e.value = INPUT_UPDATE_VALUE)} />
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.value), INPUT_UPDATE_VALUE);
    },
  },
  "Ref: Element Ref": {
    Component: class extends Component {
      ref = new Ref();
      render() {
        return (
          <>
            <button
              id="update"
              onClick={() => {
                if (this.ref.node) this.ref.node.value = INPUT_UPDATE_VALUE;
              }}
            >
              update
            </button>
            <input id="output" ref={this.ref} />
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const output = await page.querySelector("#output", { wait: true });
      equal(await output.evaluate((el) => el.value), "");
      await page.click("#update");
      equal(await output.evaluate((el) => el.value), INPUT_UPDATE_VALUE);
    },
  },
};

export default tests;
