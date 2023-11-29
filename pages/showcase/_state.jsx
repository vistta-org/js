import { useState, Profiler } from "@vistta/js";

export default function Showcase() {
  const age = useState(0);
  return (
    <Profiler callback={console.log}>
      <button onClick={() => age.set((v) => v - 1)}>-</button>
      {age}
      <button onClick={() => age.set((v) => v + 1)}>+</button>
      <p>{age((v) => (v >= 18 ? "Adult" : v > 0 ? "Under Aged" : "Invalid Age"))}</p>
    </Profiler>
  );
}
