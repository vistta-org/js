import { isServer, system } from "@/utils";

class Socket {
  active = true;
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
    this.instance.io.on("reconnect", () => location.reload());
    //this.instance.once("register", (id) => (this.serverId = id));
  }

  /*emit(event, ...args) {
    if (this.active === false) return;
    this.instance.emit(`/${this.serverId}${this.href}/${event}`, ...args);
  }

  on(event, callback) {
    if (this.active === false) return;
    this.instance.on(`/${this.serverId}${this.href}/${event}`, callback);
  }*/

  get global() {
    const { active, serverId, instance: socket } = this;
    return {
      emit(event, ...args) {
        if (active === false) return;
        socket.emit(`/g/${serverId}/${event}`, ...args);
      },
      on(event, callback) {
        if (active === false) return;
        socket.on(`/g/${serverId}/${event}`, callback);
      },
    };
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
