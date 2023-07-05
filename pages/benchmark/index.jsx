import { useState, useEffect } from "@vistta/vistta.js";
import Template from "../_template";
import Style from "./style.scss";
import Test1 from "./_tests/1";
import Test2 from "./_tests/2";
import Test3 from "./_tests/3";
import Test4 from "./_tests/4";
const ITERATIONS = 1000;
const BENCMARK_RUNS = 500;
const TESTS = {
  1: { active: true },
  2: { active: true },
  3: { active: true },
  4: { active: true },
};
const ENABLED_TESTS = Object.values(TESTS).filter((x) => x.active).length;

export default function Benchmark() {
  const counter = useState(1);
  const tests = {};
  const benchRun = () => {
    tests.running = true;
    tests.completed = 0;
    tests.results = {};
    counter.set(0);
  };
  const runComplete = (id, time) => {
    if (!tests.running) return;
    if (!tests.results[id]) tests.results[id] = time;
    else tests.results[id] += time;
    tests.completed++;
    if (tests.completed === ENABLED_TESTS) {
      tests.completed = 0;
      requestIdleCallback(() => {
        if (counter < BENCMARK_RUNS) return counter.set((v) => v + 1);
        tests.active = false;
        console.group("Benchmark Run");
        Object.entries(tests.results).forEach(([key, value]) => {
          console.log(`Benchmark #${key}: ${value / BENCMARK_RUNS}ms`);
        });
        console.groupEnd();
      });
    }
  };
  return (
    <Template>
      <Style>
        <div className="container">
          <Bench id="1" run={counter} Test={Test1} onRender={runComplete} />
          <Bench id="2" run={counter} Test={Test2} onRender={runComplete} />
          <Bench id="3" run={counter} Test={Test3} onRender={runComplete} />
          <Bench id="4" run={counter} Test={Test4} onRender={runComplete} />
          <div className="controls">
            <button className="runner" onClick={() => counter.set((v) => v + 1)}>
              Single Run
            </button>
            <button className="runner" onClick={benchRun}>
              Bench Run
            </button>
          </div>
        </div>
      </Style>
    </Template>
  );
}

function Bench({ id, run, Test, onRender }) {
  if (!TESTS[id].active) return null;
  let initial = 0;
  const timeStart = () => useEffect(() => ((initial = performance()), initial), [run]);
  const timeEnd = () =>
    useEffect(() => {
      const actualTime = performance() - initial;
      onRender(id, actualTime);
      return actualTime;
    }, [run]);
  return (
    <div className="bench" data-time={timeStart()}>
      <p>Benchmark #{id}</p>
      <div className="container">
        <Test run={run} iterations={ITERATIONS} />
      </div>
      <p>Run: {run}</p>
      <p>Time: {timeEnd()}ms</p>
    </div>
  );
}

const performance = () => (typeof window === "undefined" ? 0 : window.performance.now());
