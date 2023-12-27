import { Suspense, async } from "@vistta/js";
import { sleep } from "../../utils";

const ShowcaseSuspense = () => {
  return (
    <>
      <Suspense fallback={"...loading"}>
        <AsyncComponent />
      </Suspense>
      <div>
        <Suspense fallback={"...loading"}>
          <div>
            <AsyncComponent time={5000} />
          </div>
        </Suspense>
      </div>
    </>
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
