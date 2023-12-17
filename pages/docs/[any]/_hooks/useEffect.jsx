import { useState, useEffect } from "@vistta/js";

export default function Effect() {
  const toggle = useState(false);
  return (
    <>
      <>{toggle((v) => v && <ConditionalEffect />)}</>
      <>{toggle((v) => v && <ConditionalEffect2 />)}</>
      <button onclick={() => toggle.set((v) => !v)}>toggle</button>
    </>
  );
}

function ConditionalEffect() {
  const count = useState(0);
  useEffect(
    (init) => {
      if (init) console.log("connect");
      else console.log("update");
      return () => {
        console.log("disconnect");
      };
    },
    [count],
  );
  return (
    <>
      <label>Effect {count}</label>
      <button onclick={() => count.set((v) => v + 1)}>inc</button>
    </>
  );
}

function ConditionalEffect2() {
  const count = useState(0);
  useEffect(
    (init) => {
      if (init) console.log("connect2");
      else console.log("update2");
      return () => {
        console.log("disconnect2");
      };
    },
    [count],
  );
  return <button onclick={() => count.set((v) => v + 1)}>Effect {count}</button>;
}
