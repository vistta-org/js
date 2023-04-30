import { useState, useLegacyState, useEffect } from "@vision/visionjs";
import Template from "./@template";
//import FunctionCounter from "./@components/FunctionalCounter"; <FunctionCounter/>

const Home = () => {
  const [count, setCount] = useLegacyState(0);
  const counter = useState(0);
  const n = 1000;
  const childs = [];
  for(let i = 0; i < n; i++) {
    childs.push(<div key={"ls"+i} style={{position: "absolute", height: "100%", width: "50%", left: 0, top: 0}}>{count}</div>)
    childs.push(<div key={"cs"+i} style={{position: "absolute", height: "100%", width: "50%", right: 0, top: 0}}>{counter}</div>)
  }
  console.log("component render", new Date().getTime());
  useEffect(() => {
    console.log("useEffect", new Date().getTime());
  }, [counter, count]);
  useEffect(() => {
    console.log("counter changed", new Date().getTime());
  }, [counter]);
  return (<Template title="home">
    <div style={{position: "relative", width: "100vw", height: "5rem"}}>
      {childs}
    </div>
    <button onClick={() => setCount((v) => v + 1)}>increment Legacy</button>
    <button onClick={() => counter.value++}>increment Custom</button>
    <span>{counter}</span>
  </Template>)
};

export default Home;

/*store.configure({
  "counter": {
    initialState: 0,
    cached: "storage",
    actions: {
      increment(prev) {
        return prev + 1;
      },
      decrement(prev) {
        return prev - 1;
      },
      alert(prev, message) {
        window.alert(message + " " + prev);
      },
    },
    onAction(name, type) {
      console.log(name, type);
    }
  }
});*/