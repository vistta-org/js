import { useStore } from "@vistta/vistta.js";

export default function Store() {
  const counter = useStore("counter");
  return (
    <>
      {counter}
      <button onclick={() => counter.increment()}>increment</button>
    </>
  );
}
