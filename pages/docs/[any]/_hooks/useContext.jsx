import { useContext } from "@vistta/js";

export default function Context() {
  return (
    <div>
      <InsideContext />
      <ButtonContext label="Alert without context" />
    </div>
  );
}

function InsideContext() {
  const context = useContext();
  return (
    <>
      <input onchange={({ target }) => (context.input = target.value)} />
      <ButtonContext label="Alert with context" />
    </>
  );
}

function ButtonContext({ label }) {
  const context = useContext();
  return <button onclick={() => alert(context.input)}>{label}</button>;
}
