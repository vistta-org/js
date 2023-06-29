
import Template from "./_template";
import Style from "./style.scss";

export default function Home() {
  /*import { useStore } from "@vistta/vistta.js";
  const counter = useStore("counter");
  let controller;
  const test = () => controller = counter.test();
  const abort = () => {
    if(controller?.abort) controller.abort();
    console.log(controller);
  }
    <p>Welcome to Vistta.JS</p>
    <p>{counter}</p>
    <button onClick={counter.increment}>increment</button>
    <button onClick={counter.decrement}>decrement</button>
    <button onClick={counter.alert.bind(null, "counter:")}>alert</button>
    <button onClick={test}>test</button>
    <button onClick={abort}>abort</button>
    */
  return <Template>
    <Style>
      <div className="container">
        <h1>Vistta.JS</h1>
        <h2>Vistta.js Javascript Framework</h2>
        <button>Get Started</button>
      </div>
    </Style>
  </Template>;
}

export { config } from "./_template";