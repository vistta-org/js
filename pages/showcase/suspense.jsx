import { useState, Suspense, Profiler } from "@vistta/vistta.js";
import Template from "../_template";

const AMOUNT = 10;

const ShowcaseSuspense = () => {
  const perf = useState(0);
  return (
    <Template>
      <Suspense fallback={"...loading"}>
        <Profiler callback={({ duration }) => perf.set(duration)}>
          <RecursiveComponent>
            <p>
              <span></span>
            </p>
          </RecursiveComponent>
        </Profiler>
        <p>{perf}ms</p>
      </Suspense>
    </Template>
  );
};

const RecursiveComponent = ({ children, count = 0 }) => {
  if (count === AMOUNT) return children;
  return (
    <RecursiveComponent count={count + 1}>
      <div>{children}</div>
      <div>{children}</div>
      <div>{children}</div>
    </RecursiveComponent>
  );
};

export default ShowcaseSuspense;
