let instance = null;

export class Socket {
  static connect(host, options) {
    if (instance) return;
    const errorHandler = (error) => {
      console.error(`Socket Internal Error: ${error.message || error}`);
      return null;
    };
    if (window.platform === "mobile") {
      instance = import("@vistta/js-native/plugins")
        .then(({ Net: { Socket } }) => {
          const id = Socket.connect(host, options);
          Socket.on(id, "connect_error", errorHandler);
          Socket.on(id, "reconnect", () => location.reload());
          return {
            emit: (name, ...args) => Socket.emit(id, name, ...args),
            on: (name, handler) => Socket.on(id, name, handler),
            off: (name, handler) => Socket.off(id, name, handler),
          };
        })
        .catch(errorHandler);
    } else {
      // @ts-ignore
      instance = import("@socket")
        .then(({ io }) => {
          if (!io) return;
          const result = io(host, { reconnectionDelay: 10000, ...(options || {}) });
          result.on("connect_error", (error) => console.error(`Socket Internal Error: ${error.message}`));
          result.io.on("reconnect", () => location.reload());
          return result;
        })
        .catch(errorHandler);
    }
  }

  /**
   * Emits an event to the socket.
   * @param {string} event - The event name.
   * @param {...any} args - The arguments to pass with the event.
   */
  static emit(event, ...args) {
    if (typeof event !== "string") return console.warn("Cannot emit an empty event");
    if (!instance) return console.warn("Socket not connected");
    instance.then((socket) => {
      if (!socket) return console.warn("Socket not connected");
      socket.emit(event, ...args);
    });
  }

  /**
   * Registers an event listener on the socket.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback function to execute when the event is triggered.
   */
  static on(event, callback) {
    if (!instance) return console.warn("Socket not connected");
    instance.then((socket) => {
      if (!socket) return console.warn("Socket not connected");
      socket.on(event, callback);
    });
  }

  /**
   * Removes an event listener from the socket.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback function to remove.
   */
  static off(event, callback) {
    if (!instance) return console.warn("Socket not connected");
    instance.then((socket) => {
      if (!socket) return console.warn("Socket not connected");
      socket.off(event, callback);
    });
  }
}

export default Socket;
