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
    if (typeof url === "function") callback = url, url = "/";
    super(async (request) => await async(callback(request.params, request.body)));
    this.#type = type;
    this.#url = url;
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
 * Sets a controller for any request.
 * 
 * @param {Function} callback Options for the request.
 * @also
 * @param {string} url - The URL for the request.
 * @param {Function} callback Options for the request.
 * @returns {Function} A promise that resolves to the response data.
 */
export const Any = (url, callback) => new Method("any", url, callback);

export default class Controller {
  constructor(socket) {
    this.socket = socket;
  }
}
