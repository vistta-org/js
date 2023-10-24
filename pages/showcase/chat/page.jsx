import { useState } from "@vistta/vistta.js";
import Form from "./_form";
import Chat from "./_chat";

export default function ChatPage() {
  const user = useState("");
  let messages;
  const onLogin = ({ username, messages: _messages }) => {
    user.set(username);
    messages = _messages;
  };
  return (
    <>
      <h1>Chat</h1>
      {user((username) =>
        username?.length ? <Chat username={username} messages={messages} /> : <Form onLogin={onLogin} />,
      )}
    </>
  );
}
