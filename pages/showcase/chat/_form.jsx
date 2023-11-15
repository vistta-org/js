import { request } from "@uttils/kit/request";

export default function Form({ onLogin }) {
  const onSubmit = async (e) => {
    e.preventDefault();
    const { username } = buildForm(e);
    if (!(username?.length > 3)) return alert("Invalid username.");
    const { data: response } = await request.post({
      url: "/api/join-chat",
      body: { username },
    });
    if (response.error) return alert(response.error);
    if (response.success) onLogin({ username, messages: response.messages });
    else alert("Unknown Error.");
  };
  return (
    <>
      <form onsubmit={onSubmit}>
        <input placeholder="Name" name="username" />
        <button>Join</button>
      </form>
    </>
  );
}

export function buildForm(event) {
  const { srcElement: form } = event;
  const values = {};
  form?.querySelectorAll("input")?.forEach((input) => {
    values[input.name] = input.value;
  });
  return values;
}
