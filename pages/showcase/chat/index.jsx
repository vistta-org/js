import { useState, useEffect } from "@vistta/vistta.js";
import Template from "../../_template";
import Form from "./_form";
import Chat from "./_chat";

export default function ChatPage() {
  const user = useState("");
  let messages;
  const onLogin = ({ username, messages: _messages }) => {
    user.value = username;
    messages = _messages;
  };
  const content = useEffect(() =>
    user.value ? <Chat username={user.value} messages={messages} /> : <Form onLogin={onLogin} />,
  );
  return (
    <Template>
      <h1>Chat</h1>
      {content}
    </Template>
  );
}
