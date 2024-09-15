import { INVALID_EVENT_NAME, convertToEventName } from "../utils";

class Socket {
  #instance;

  get href() {
    return this.router.pathname;
  }

  constructor() {
    if (typeof process === "undefined")
      import("@socket")
        .then(({ io }) => {
          if (!io || this.#instance) return;
          this.#instance = io({ reconnectionDelay: 10000 });
          this.#instance.on("connect_error", (error) => console.error(`Socket Internal Error: ${error.message}`));
          this.#instance.io.on("reconnect", () => location.reload());
        })
        .catch((error) => {
          console.error(`Socket Internal Error: ${error.message}`);
        });
  }

  emit(event, ...args) {
    event = convertToEventName(event);
    if (!event) return console.warn(INVALID_EVENT_NAME);
    if (!this.#instance) return console.warn("Socket Internal Error");
    this.#instance.emit(event, ...args);
  }

  on(event, callback) {
    event = convertToEventName(event);
    if (!event) return console.warn(INVALID_EVENT_NAME);
    if (!this.#instance) return console.warn("Socket Internal Error");
    this.#instance.on(event, callback);
  }
}

export const socket = new Socket();

export default Socket;
