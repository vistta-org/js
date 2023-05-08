// import { createStoreConfig } from "@vistta/visttajs";
// import Template from "./@template";
// import FunctionCounter from "./@components/FunctionalCounter"; 
import Counter from "./@components/counter";
import Check from "./@components/check";
import Toggle from "./@components/toggle";
//import icon from "../logo.png";

const Home = () => {
  return <>
    <h1>Playground</h1>
    <Toggle/>
  </>
};

export default Home;

/*
    <br></br>
    <Counter/>
    <br></br>
    <Check/>
    <br></br>
    
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
}*/
