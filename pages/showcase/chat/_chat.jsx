import { State, useSocket } from "@vistta/js";
import { buildForm } from "./_form";

export default function Chat({ username, messages: _messages }) {
  const { emit, on } = useSocket();
  const messages = new State(_messages);
  on("chat-update", (_messages) => messages.set(_messages));
  const onSubmit = async (e) => {
    e.preventDefault();
    const message = buildForm(e);
    message.username = username;
    emit("message", message);
  };
  return (
    <>
      {messages((value) => value?.map(({ username, message }) => <p>{`${username}: ${message}`}</p>))}
      <form onsubmit={onSubmit}>
        <input placeholder="Message" name="message" />
        <button>Send</button>
      </form>
    </>
  );
}
