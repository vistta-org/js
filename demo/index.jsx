// import { createStoreConfig } from "@vistta/visttajs";
// import Template from "./@template";
// import FunctionCounter from "./@components/FunctionalCounter"; 
import icon from "../logo.png";

const Home = () => {
  const span = "<span></span>";
  return (<h1>Hello World {span}</h1>)
};

export default Home;

/*export const config = {
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
}*/
