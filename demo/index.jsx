import Template from "./_template";
import global from "./global.scss"
import icon from "../logo.png";

export default function Home() {
  return <Template>
    <p>Welcome to Vistta.js</p>
  </Template>;
}

export const config = {
  icon: icon,
  styles: [global]
}

/*
export const config = {
  icon: icon,
  store: [
    createStoreConfig(
      "counter",
      0,
      "storage",
      {
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
      (name, type) => console.log(name, type)
    )
  ]
}
*/