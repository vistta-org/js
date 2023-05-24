import Template from "./_template";
import icon from "../logo.png";

export default function Home() {
  return <Template>
    <p>Hello World</p>
  </Template>;
}

export const config = {
  icon: icon
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