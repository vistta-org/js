import { isServer, system } from "../utils";

class Socket {
  active = false;
  get href() {
    return this.router.active;
  }

  constructor() {
    if (isServer()) return this;
    import("@socket")
      .then(({ io }) => this.connect(io))
      .catch(() => (this.active = false));
  }

  connect(io) {
    if (!io || this.instance) return;
    this.instance = io({ reconnectionDelay: 10000 });
    this.instance.on("connect", () => (this.active = true));
    this.instance.io.on("reconnect", () => location.reload());
  }

  emit(event, ...args) {
    if (this.active === false || typeof event !== "string") return;
    this.instance.emit(transformEventName(event), ...args);
  }

  on(event, callback) {
    if (this.active === false || typeof event !== "string") return;
    this.instance.on(transformEventName(event), callback);
  }
}

const socket = new Socket();

export default socket;

export const useSocket = () => {
  if (isServer()) system.set("route.socket", true);
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

function transformEventName(string) {
  return string
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/-/g, "_");
}
