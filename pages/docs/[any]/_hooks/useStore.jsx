import useStore from "../../../_store";

export default function Store() {
  const counter = useStore("counter");
  return (
    <>
      {counter}
      <button onclick={() => counter.increment()}>increment</button>
    </>
  );
}
