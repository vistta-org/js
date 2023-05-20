/* eslint-disable react/prop-types */
import { useState } from "@vistta/visttajs";
import Test1 from "./1";
import Test2 from "./2";
import Test3 from "./3";
import Test4 from "./4";
import Style from "./style";
const ITERATIONS = 1000;
const BENCMARK_RUNS = 100;
const NUMBER_OF_TESTS = 4;

export default function Benchmark() {
  const counter = useState(1);
  const tests = {};
  const benchRun = () => {
    tests.running = true;
    tests.completed = 0;
    tests.results = {};
    counter.value = 0;
  };
  const runComplete = (id, time) => {
    if (!tests.running) return;
    if (!tests.results[id]) tests.results[id] = time;
    else tests.results[id] += time;
    tests.completed++;
    if (tests.completed === NUMBER_OF_TESTS) {
      tests.completed = 0;
      requestIdleCallback(() => {
        if (counter.value < BENCMARK_RUNS) return counter.value++;
        tests.active = false;
        console.group("Benchmark Run");
        Object.entries(tests.results).forEach(([key, value]) => {
          console.log(
            `Benchmark #${key}: ${(value) / BENCMARK_RUNS}ms`
          );
        });
        console.groupEnd();
      });
    }
  };
  return (
    <>
      <Style/>
      <div className="container">
        <Bench id="1" run={counter} Test={Test1} onRender={runComplete} />
        <Bench id="2" run={counter} Test={Test2} onRender={runComplete} />
        <Bench id="3" run={counter} Test={Test3} onRender={runComplete} />
        <Bench id="4" run={counter} Test={Test4} onRender={runComplete} />
        <div className="controls">
          <button className="runner" onClick={() => counter.value++}>
            Single Run
          </button>
          <button className="runner" onClick={benchRun}>
            Bench Run
          </button>
        </div>
      </div>
    </>
  );
}

function Bench({ id, run, Test, onRender }) {
  let initial = 0;
  const timeStart = run.compute(() => (initial = performance(), initial));
  const timeEnd = run.compute(() => {
    const actualTime = performance() - initial;
    onRender(id, actualTime);
    return actualTime;
  });
  return (
    <div className="bench" data-time={timeStart}>
      <p>Benchmark #{id}</p>
      <div className="container">
        <Test run={run} iterations={ITERATIONS} />
      </div>
      <p>Run: {run}</p>
      <p>Time: {timeEnd}ms</p>
    </div>
  );
}

const performance = () => typeof window === "undefined" ? 0 :window.performance.now();