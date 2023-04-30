import { createStoreConfig } from "@vision/visionjs";
import Template from "./@template";
import FunctionCounter from "./@components/FunctionalCounter"; 
import icon from "../logo.png";

const Home = () => {
  return (<Template title="home">
    <FunctionCounter/>
    <FunctionCounter/>
  </Template>)
};

export default Home;

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
