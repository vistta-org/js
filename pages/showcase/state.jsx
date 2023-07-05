import { useState, useEffect } from "@vistta/vistta.js";
import Template from "../_template";

export default function Showcase() {
  const age = useState(0);
  return (
    <Template>
      <button onClick={() => age.set((v) => v - 1)}>-</button>
      {age}
      <button onClick={() => age.set((v) => v + 1)}>+</button>
      <p>{useEffect(() => (age > 18 ? "Adult" : age > 0 ? "Under Aged" : "Invalid Age"))}</p>
    </Template>
  );
}
