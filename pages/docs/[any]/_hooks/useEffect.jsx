import { State, Effect } from "@vistta/js";

export default function DocEffect() {
  const toggle = new State(false);
  return (
    <>
      <>{toggle((v) => v && <ConditionalEffect />)}</>
      <button onclick={() => toggle.set((v) => !v)}>toggle</button>
    </>
  );
}

function ConditionalEffect() {
  const count = new State(0);
  new Effect(
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
