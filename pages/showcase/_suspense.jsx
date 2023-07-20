import { Suspense, async } from "@vistta/vistta.js";
import Template from "../_template";
import { sleep } from "../../utils";

const ShowcaseSuspense = () => {
  return (
    <Template>
      <Suspense fallback={"...loading"}>
        <div>
          <AsyncComponent />
        </div>
        <div>
          <div>
            <AsyncComponent time={5000} />
          </div>
        </div>
      </Suspense>
    </Template>
  );
};

const AsyncComponent = async(async ({ time = 1000 }) => {
  await sleep(time);
  return <p>{"Loaded"}</p>;
});

/*

const AMOUNT = 10;
  const perf = useState(0);
        <Profiler callback={({ duration }) => perf.set(duration)}>
          <RecursiveComponent>
            <p>
              <span></span>
            </p>
          </RecursiveComponent>
        </Profiler>
        <p>{perf}ms</p>
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

*/

export default ShowcaseSuspense;
