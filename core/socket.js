import { HOOKS_ERROR } from "./hooks";
import { INTERNAL } from "./context";
import { isServer, INVALID_EVENT_NAME, convertToEventName } from "../utils";

class Socket {
  active = false;
  get href() {
    return this.router.active;
  }

  constructor() {
    if (isServer()) return this;
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
  if (!INTERNAL.RENDER.IS_ACTIVE(HOOKS_ERROR)) return null;
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
