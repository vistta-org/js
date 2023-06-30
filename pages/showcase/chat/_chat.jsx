import { useState, useEffect, useSocket } from "@vistta/vistta.js";
import { buildForm } from "./_form";

export default function Chat({ username, messages: _messages }) {
  const { emit, on } = useSocket();
  const messages = useState(_messages);
  on("chat-update", (_messages) => (messages.value = _messages));
  const onSubmit = async (e) => {
    e.preventDefault();
    const message = buildForm(e);
    message.username = username;
    emit("message", message);
  };
  return (
    <>
      {useEffect(() => messages.value?.map(({ username, message }) => <p>{`${username}: ${message}`}</p>), [messages])}
      <form onsubmit={onSubmit}>
        <input placeholder="Message" name="message" />
        <button>Send</button>
      </form>
    </>
  );
}
