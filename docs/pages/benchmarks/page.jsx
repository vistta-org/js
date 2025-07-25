import { Component, Profiler } from "@vistta/js";
import Test1 from "./_tests/1";
import Test2 from "./_tests/2";
import Test3 from "./_tests/3";
import Test4 from "./_tests/4";
import style from "./style.scss";
const ITERATIONS = 1000;
const BENCHMARK_RUNS = 500;
const TESTS = {
  1: { active: true },
  2: { active: true },
  3: { active: true },
  4: { active: true },
};
const ENABLED_TESTS = Object.values(TESTS).filter((x) => x.active).length;
const results = { count: 0 };

class Page extends Component {
  counter = 1;
  active = false;

  run() {
    this.counter = 0;
    this.active = true;
    results.count = 0;
  }

  onComplete(id, time) {
    if (!this.active) return console.log(`Single Run #${id}: ${time}ms`);
    if (!results[id]) results[id] = time;
    else results[id] += time;
    results.count++;
    if (results.count === ENABLED_TESTS) {
      results.count = 0;
      if (this.counter < BENCHMARK_RUNS) return setTimeout(() => (this.counter += 1), 10);
      this.active = false;
      console.group("Benchmark Run");
      Object.entries(results).forEach(([key, value]) => {
        if (key === "count") return;
        console.log(`Benchmark #${key}: ${value / BENCHMARK_RUNS}ms`);
      });
      console.groupEnd();
    }
  }

  render() {
    return (
      <div className="container" {...style}>
        <Bench id="1" run={this.counter} test={Test1} callback={(...args) => this.onComplete(...args)} />
        <Bench id="2" run={this.counter} test={Test2} callback={(...args) => this.onComplete(...args)} />
        <Bench id="3" run={this.counter} test={Test3} callback={(...args) => this.onComplete(...args)} />
        <Bench id="4" run={this.counter} test={Test4} callback={(...args) => this.onComplete(...args)} />
        <div className="controls">
          <button className="runner" onclick={() => (this.counter += 1)}>
            Single Run
          </button>
          <button className="runner" onclick={this.run} disabled={this.active}>
            Bench Run
          </button>
          {"production" === process.env.NODE_ENV && <h2 className="warning">*Benchmark only works no Development Mode*</h2>}
        </div>
      </div>
    );
  }
}

export default Page;

class Bench extends Component {
  id;
  test;
  run;
  callback;

  render() {
    if (!TESTS[this.id].active) return null;
    const Test = this.test;
    return (
      <div class="bench">
        <p>Benchmark #{this.id}</p>
        <div className="display">
          <Profiler callback={(time) => this.callback?.(this.id, time)}>
            <Test run={this.run} iterations={ITERATIONS} />
          </Profiler>
        </div>
        <p>Run: {this.run}</p>
      </div>
    );
  }
}
