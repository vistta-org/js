import { useState } from "@vistta/visttajs";

const Counter = () => {
  const counter = useState(0);
  return (
    <button onClick={() => counter.value++}>Counter: {counter}</button>
  );
};

export default Counter;