import { Form, State } from "@vistta/js";

export default function Doc() {
  const moreInfo = new State(true);
  const MyForm = new Form();
  MyForm.watch("username", console.log);
  MyForm.watch("moreInfo", ({ target: { checked } }) => moreInfo.set(checked));
  return (
    <MyForm onSubmit={(event) => console.log(event.value)}>
      <input type="text" name="username" placeholder="username"></input>
      <input type="password" name="password" placeholder="password"></input>
      <input type="checkbox" name="moreInfo" placeholder="moreInfo" checked={moreInfo}></input>
      {moreInfo((v) => v && <SubForm />)}
      <input type="submit" />
      <button onclick={() => MyForm.clear()}>Clear</button>
      <button onclick={() => MyForm.reset()}>Reset</button>
      <button onclick={() => MyForm.submit()}>Submit</button>
    </MyForm>
  );
}

function SubForm() {
  const MyForm = new Form(); //
  return (
    <MyForm name="other">
      <input type="email" name="email" placeholder="email"></input>
      <textarea name="bio" placeholder="bio">
        change me
      </textarea>
      <div role="input" name="age" contentEditable></div>
    </MyForm>
  );
}
