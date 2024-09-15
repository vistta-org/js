import { Component, Profiler } from "@vistta/js";

const PERFORMANCE_THRESHOLD = 10;

class Test extends Component {
  run;
  iterations;

  render() {
    let children = []; //
    if (this.run % 2 == 0) {
      for (let i = 0; i < this.iterations; i++)
        children.push(
          <input
            key={"test3.even." + i}
            placeholder="even"
            style={{ position: "absolute", inset: "5px 50vw auto auto" }}
          />,
        );
    } else {
      for (let i = 0; i < this.iterations; i++)
        children.push(
          <input
            key={"test3.odd." + i}
            placeholder="odd"
            style={{ position: "absolute", inset: "5px 50vw auto auto" }}
          />,
        );
    }
    return children;
  }
}

const tests = {
  "Component: Profiler": {
    Component: class extends Component {
      counter = 0;
      performance;
      render() {
        return (
          <>
            <button id="update" onClick={() => this.counter++}>
              update
            </button>
            <Profiler callback={(p) => (this.performance = p)}>
              <Test run={this.counter} iterations={100} />
            </Profiler>
            <div id="performance">{this.performance}</div>
          </>
        );
      }
    },
    test: async (page, { equal }) => {
      const performance = await page.querySelector("#performance", {
        wait: true,
      });

      await page.click("#update");
      equal(
        Number(await performance.evaluate((el) => el.textContent)) <
          PERFORMANCE_THRESHOLD,
        true,
      );

      await page.click("#update");
      equal(
        Number(await performance.evaluate((el) => el.textContent)) <
          PERFORMANCE_THRESHOLD,
        true,
      );
    },
  },
};

export default tests;
