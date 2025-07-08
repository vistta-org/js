import { async, FunctionClass } from "../utils/index.js";

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
        await async(
          callback.call(
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
            type === "get" || type === "delete"
              ? request.params
              : await request.body()
          )
        )
    );
    this.#type = type;
    this.#url = url;
  }
}

export class WebSocket {
  #events;

  constructor(events) {
    if (typeof events !== "object" || Array.isArray(events))
      throw new TypeError("WebSocket events must be an object");
    this.#events = events;
  }

  get events() {
    return this.#events;
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
export const Copy = (url, callback) => new Method("copy", url, callback);

/**
 * Sets a controller DELETE.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Delete = (url, callback) => new Method("delete", url, callback);

/**
 * Sets a controller GET.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Get = (url, callback) => new Method("get", url, callback);

/**
 * Sets a controller MOVE.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Move = (url, callback) => new Method("move", url, callback);

/**
 * Sets a controller PATCH.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Patch = (url, callback) => new Method("patch", url, callback);

/**
 * Sets a controller POST.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Post = (url, callback) => new Method("post", url, callback);

/**
 * Sets a controller PUT.
 *
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Put = (url, callback) => new Method("put", url, callback);

/**
 * Registers a WebSocket controller.
 * @param {Record<string, function>} events - An object containing event handlers for the WebSocket.
 * @returns {WebSocket} A new controller WebSocket instance.
 */
export const Socket = (events) => new WebSocket(events);

export default class Controller {}

export function shareToLoader(filepath, value) {
  if (global.loaders.shared[filepath]) return;
  global.loaders.shared[filepath] = value;
}
