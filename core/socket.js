import { INVALID_EVENT_NAME, convertToEventName } from "../utils";

class Socket {
  #instance;

  /**
   * Gets the current router pathname.
   * @returns {string} The current pathname.
   */
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

  /**
   * Emits an event to the socket.
   * @param {string} event - The event name.
   * @param {...any} args - The arguments to pass with the event.
   */
  emit(event, ...args) {
    event = convertToEventName(event);
    if (!event) return console.warn(INVALID_EVENT_NAME);
    if (!this.#instance) return console.warn("Socket Internal Error");
    this.#instance.emit(event, ...args);
  }

  /**
   * Registers an event listener on the socket.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback function to execute when the event is triggered.
   */
  on(event, callback) {
    event = convertToEventName(event);
    if (!event) return console.warn(INVALID_EVENT_NAME);
    if (!this.#instance) return console.warn("Socket Internal Error");
    this.#instance.on(event, callback);
  }
}

export const socket = new Socket();

export default Socket;
