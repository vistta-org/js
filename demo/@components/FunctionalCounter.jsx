import { useState, useStyles } from "@vision/visionjs";
import style from "./style.scss";// id1

const FunctionCounter = () => {
  const counter = useState("counter", -1);
  const StyleProvider = useStyles(style);
  return (<StyleProvider>
    <h6>{counter}/{counter + 2}</h6>
    <button onClick={counter.increment}>increment</button>
    <button onClick={counter.decrement}>decrement</button>
    <button onClick={() => counter.alert("wow")}>alert</button>
  </StyleProvider>);
}

export default FunctionCounter;