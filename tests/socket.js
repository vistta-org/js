let counter = 0;

export function ping(socket) {
  socket.emit("pong", counter++);
}
