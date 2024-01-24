import { RENDER } from "./internal";
import { INVALID_EVENT_NAME, convertToEventName } from "../utils";

class Socket {
  active = false;
  get href() {
    return this.router.active;
  }

  constructor() {
    if (process.env.IS_NODE) return this;
    import("@socket")
      .then(({ io }) => this.connect(io))
      .catch((e) => (console.error(e), this.active = false));
  }

  connect(io) {
    if (!io || this.instance) return;
    this.instance = io({ reconnectionDelay: 10000 });
    this.instance.on("connect", () => (this.active = true));
    this.instance.io.on("reconnect", () => location.reload());
  }

  emit(event, ...args) {
    event = convertToEventName(event);
    if ("production" !== process.env.NODE_ENV && !event) console.warn(INVALID_EVENT_NAME);
    if (this.active === false || !event) return;
    this.instance.emit(event, ...args);
  }

  on(event, callback) {
    event = convertToEventName(event);
    if ("production" !== process.env.NODE_ENV && !event) console.warn(INVALID_EVENT_NAME);
    if (this.active === false || !event) return;
    this.instance.on(event, callback);
  }
}

const socket = new Socket();

export default socket;

export const useSocket = () => {
  if (!RENDER.IS_ACTIVE("Socket")) return null;
  return {
    emit: (...args) => socket.emit(...args),
    on: (...args) => socket.on(...args),
    global: {
      emit: (...args) => socket.global.emit(...args),
      on: (...args) => socket.global.on(...args),
    },
  };
};

//
