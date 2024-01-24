import { Context } from "@vistta/js";

export default function DocContext() {
  return (
    <div>
      <InsideContext />
      <ButtonContext label="Alert without context" />
    </div>
  );
}

function InsideContext() {
  const myContext = new Context("test");
  myContext.test = "123";
  return (
    <>
      <input onchange={({ target }) => (myContext.input = target.value)} />
      <ButtonContext label="Alert with context" />
    </>
  );
}

function ButtonContext({ label }) {
  const myContext = new Context("test");
  return <button onclick={() => alert(myContext.input)}>{label}</button>;
}
