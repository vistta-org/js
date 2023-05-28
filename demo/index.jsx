import { Store, useStore } from "@vistta/visttajs";
import Template from "./_template";
import global from "./global.scss"
import icon from "../logo.png";

export default function Home() {
  const counter = useStore("counter");
  return <Template>
    <p>Welcome to Vistta.js</p>
    <p>{counter}</p>
    <button onClick={counter.increment}>increment</button>
    <button onClick={counter.decrement}>decrement</button>
    <button onClick={counter.alert.bind(null, "counter:")}>alert</button>
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
      ],
      reducer: (name, type) => console.log(name, type)
    })
  ])
}