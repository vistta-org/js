import { Store, useStore } from "@vistta/visttajs";
import Template from "./_template";
import global from "./global.scss"
import icon from "../logo.png";

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

export const config = {
  icon: icon,
  styles: [global],
  store: new Store([
    Store.createPartition("counter", {
      initialState: 0,
      cache: "storage",
      actions: [
        Store.createAction("increment", (prev) => prev + 1, console.log),
        Store.createAction("decrement", (prev) => prev - 1, console.log),
        Store.createAction("alert", (prev, message) => window.alert(message + " " + prev), console.log),
        Store.createAction("test", (prev) => new Promise((resolve) => setTimeout(() => resolve(prev + 100), 5000)), console.log),
      ]
    })
  ])
}