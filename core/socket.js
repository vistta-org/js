let instance = null;

export class Socket {
  /**
   * Connects to a Socket.IO server.
   * @param {string} [host] - The server URL. Defaults to the current origin in browsers.
   * @param {Record<string, any> & { onReconnect?: (() => void) | null, auth?: Record<string, any> | (() => Record<string, any> | Promise<Record<string, any>>) }} [options] - Socket.IO options. `onReconnect` runs when the connection is restored after a drop or failed attempt (default: reload the page; `null` to do nothing). `auth` can be a function, called before each connection attempt.
   */
  static connect(host, { onReconnect = () => location.reload(), auth, ...options } = {}) {
    if (instance) return;
    const errorHandler = (error) => {
      console.error(`Socket Internal Error: ${error.message || error}`);
      return null;
    };
    const getAuth =
      typeof auth === "function"
        ? async () => {
            try {
              return await auth();
            } catch (error) {
              errorHandler(error);
            }
          }
        : null;
    let current = auth;
    // A rejected handshake is not retried by Socket.IO, so retry only when the auth changed.
    const authChanged = async () => {
      const next = await getAuth();
      if (!next || JSON.stringify(next) === JSON.stringify(current)) return false;
      current = next;
      return true;
    };
    let dropped = false;
    const watchReconnect = (on) => {
      on("disconnect", () => (dropped = true));
      on("connect_error", () => (dropped = true));
      on("connect", () => {
        if (!dropped) return;
        dropped = false;
        onReconnect?.();
      });
    };
    if (window.platform === "mobile") {
      instance = import("@vistta/js-native/plugins")
        .then(async ({ Net: { Socket } }) => {
          if (getAuth) current = await getAuth();
          const id = Socket.connect(host, { ...options, auth: current });
          Socket.on(id, "connect_error", errorHandler);
          // The native client keeps the options it was created with, so new auth needs a new connection.
          if (getAuth)
            Socket.on(id, "connect_error", async () => {
              if (await authChanged()) Socket.reconnect(id, host, { ...options, auth: current });
            });
          watchReconnect((name, handler) => Socket.on(id, name, handler));
          return {
            emit: (name, ...args) => Socket.emit(id, name, ...args),
            on: (name, handler, options) => Socket.on(id, name, handler, options),
            off: (name, handler) => Socket.off(id, name, handler),
          };
        })
        .catch(errorHandler);
    } else {
      // @ts-ignore
      instance = import("@socket")
        .then(({ io }) => {
          if (!io) return;
          const result = io(host, {
            reconnectionDelay: 10000,
            ...options,
            auth: getAuth ? (callback) => getAuth().then((value) => callback((current = value || current))) : auth,
          });
          result.on("connect_error", async (error) => {
            console.error(`Socket Internal Error: ${error.message}`);
            if (getAuth && !result.active && (await authChanged())) result.connect();
          });
          watchReconnect((name, handler) => result.on(name, handler));
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
   * @param {{ mobile?: { background?: boolean } }} [options] - `mobile.background` keeps delivering the event while the mobile app is backgrounded; other events are dropped there until it resumes. Ignored on desktop and web.
   */
  static on(event, callback, options = {}) {
    if (options.mobile?.background !== undefined && typeof options.mobile.background !== "boolean")
      throw new TypeError("mobile.background must be a boolean");
    if (!instance) return console.warn("Socket not connected");
    instance.then((socket) => {
      if (!socket) return console.warn("Socket not connected");
      socket.on(event, callback, options);
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
