import { useStore } from "@vistta/vistta.js";
import Template from "./_template";

export default function Home() {
  const counter = useStore("counter");
  let controller;
  const test = () => controller = counter.test();
  const abort = () => {
    if(controller?.abort) controller.abort();
    console.log(controller);
  }
  return <Template>
    <p>Welcome to Vistta.JS</p>
    <p>{counter}</p>
    <button onClick={counter.increment}>increment</button>
    <button onClick={counter.decrement}>decrement</button>
    <button onClick={counter.alert.bind(null, "counter:")}>alert</button>
    <button onClick={test}>test</button>
    <button onClick={abort}>abort</button>
  </Template>;
}

export { config } from "./_template";