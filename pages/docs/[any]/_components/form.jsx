import { useForm } from "@vistta/js";

export default function Doc() {
  const Form = useForm((event) => {
    console.log(event);
  });
  Form.watch("username", console.log);
  return (
    <Form>
      <input type="text" name="username" placeholder="username"></input>
      <input type="password" name="password" placeholder="password"></input>
      <SubForm />
      <input type="submit" />
      <button onclick={() => Form.clear()}>Clear</button>
      <button onclick={() => Form.reset()}>Reset</button>
      <button onclick={() => Form.submit()}>Submit</button>
    </Form>
  );
}

function SubForm() {
  const Form = useForm();
  return (
    <Form name="other">
      <input type="email" name="email" placeholder="email"></input>
      <textarea name="bio" placeholder="bio">
        change me
      </textarea>
      <div role="input" name="age" contentEditable></div>
    </Form>
  );
}
