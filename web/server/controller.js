import { socket } from "../../core/socket.js";
import { FunctionClass } from "../../utils/index.js";

export class Method extends FunctionClass {
  #type;
  #url;

  get type() {
    return this.#type;
  }

  get url() {
    return this.#url;
  }

  constructor(type, url, callback) {
    if (typeof url === "function") ((callback = url), (url = "/"));
    super(
      async (request, response) =>
        await callback.call(
          {
            set: response.set,
            get: (type) => {
              type = type.split(".");
              let current = request;
              for (let i = 0, len = type.length; i < len; i++) {
                if (current[type[i]] === undefined) return undefined;
                current = current[type[i]];
              }
              return current;
            },
            redirect: response.redirect,
            ...request.socket,
          },
          Object.assign({}, request.params, await request.body()),
        ),
    );
    this.#type = type;
    this.#url = url;
  }
}

export class WebSocketListener extends FunctionClass {
  #name;

  get name() {
    return this.#name;
  }

  constructor(name, callback) {
    super(async (...args) => await callback.call(...args));
    this.#name = name;
  }
}

/**
 * Sets a controller COPY.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const copy = (url, callback) => new Method("copy", url, callback);

/**
 * Sets a controller DELETE.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const del = (url, callback) => new Method("delete", url, callback);

/**
 * Sets a controller GET.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const get = (url, callback) => new Method("get", url, callback);

/**
 * Sets a controller MOVE.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const move = (url, callback) => new Method("move", url, callback);

/**
 * Sets a controller PATCH.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const patch = (url, callback) => new Method("patch", url, callback);

/**
 * Sets a controller POST.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const post = (url, callback) => new Method("post", url, callback);

/**
 * Sets a controller PUT.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const put = (url, callback) => new Method("put", url, callback);

/**
 * Sets a controller WebSocket event listener.
 *
 * @param {string} event - The event name to listen for.
 * @param {Function} callback - The callback function to execute when the event is triggered.
 * @returns {Method} A new Method instance representing the WebSocket event listener.
 */
socket.on = (event, callback) => new WebSocketListener(event, callback);
socket.emit = () => {}; // Dummy function to avoid errors in server environment

export { socket };

export default class Controller {}

export function shareToLoader(filepath, value) {
  if (global.loaders.shared[filepath]) return;
  global.loaders.shared[filepath] = value;
}
