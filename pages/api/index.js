import { messages } from "./join-chat";

export function message(socket, message) {
  messages.push(message);
  socket.announce("chat-update", messages);
}
