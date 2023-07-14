import { useState, useEffect, Profiler } from "@vistta/vistta.js";
import Template from "../_template";

export default function Showcase() {
  const age = useState(0);
  return (
    <Template>
      <Profiler callback={console.log}>
        <button onClick={() => age.set((v) => v - 1)}>-</button>
        {age}
        <button onClick={() => age.set((v) => v + 1)}>+</button>
        <p>{useEffect(() => (age > 18 ? "Adults" : age > 0 ? "Under Aged" : "Invalid Age"))}</p>
      </Profiler>
    </Template>
  );
}
