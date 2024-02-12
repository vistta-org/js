import { INVALID_EVENT_NAME, convertToEventName, BaseClass } from "../utils";

class Socket extends BaseClass {
  #active = false;
  #route;
  #instance;

  get href() {
    return this.router.active;
  }

  get active() {
    return this.#active;
  }

  get route() {
    return this.#route;
  }

  constructor() {
    super();
    if (process.env.IS_NODE) return this;
    import("@socket")
      .then(({ io }) => this.#connect(io))
      .catch((e) => (console.error(e), this.#active = false));
  }

  #connect(io) {
    if (!io || this.#instance) return;
    this.#instance = io({ reconnectionDelay: 10000 });
    this.#instance.on("connect", () => (this.#active = true));
    this.#instance.io.on("reconnect", () => location.reload());
  }

  register(route) {
    this.#route = route;
    if ("production" !== process.env.NODE_ENV) this.#instance.on(`@app/refresh`, (href) => route.refresh(href));
  }

  emit(event, ...args) {
    event = convertToEventName(event);
    if ("production" !== process.env.NODE_ENV && !event) console.warn(INVALID_EVENT_NAME);
    if (this.#active === false || !event) return;
    this.#instance.emit(event, ...args);
  }

  on(event, callback) {
    event = convertToEventName(event);
    if ("production" !== process.env.NODE_ENV && !event) console.warn(INVALID_EVENT_NAME);
    if (this.#active === false || !event) return;
    this.#instance.on(event, callback);
  }
}

export const socket = new Socket();

export default Socket;
