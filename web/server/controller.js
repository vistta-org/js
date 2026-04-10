import { FunctionClass } from "../../utils/index.js";

/**
 * @template T
 * @typedef {{ [K in keyof T]?: T[K] }} Optional
 */

/**
 * @template {((args: Record<string, any>) => any)} Callback
 * @typedef {(
 *   args?: Optional<Parameters<Callback>[0]>
 * ) => Promise<Awaited<ReturnType<Callback>>>} RESTMethodCallback
 */

export class RESTMethod extends FunctionClass {
  #type;
  #url;

  get type() {
    return this.#type;
  }

  get url() {
    return this.#url;
  }

  constructor(type, url, callback) {
    super(callback);
    this.#type = type;
    this.#url = url;
  }
}

/**
 * Sets a controller COPY.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const COPY = (url, callback) => /** @type {any} */(new RESTMethod("copy", url, callback));

/**
 * Sets a controller DELETE.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const DELETE = (url, callback) => /** @type {any} */(new RESTMethod("delete", url, callback));

/**
 * Sets a controller GET.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const GET = (url, callback) => /** @type {any} */(new RESTMethod("get", url, callback));

/**
 * Sets a controller MOVE.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const MOVE = (url, callback) => /** @type {any} */(new RESTMethod("move", url, callback));

/**
 * Sets a controller PATCH.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const PATCH = (url, callback) => /** @type {any} */(new RESTMethod("patch", url, callback));

/**
 * Sets a controller POST.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const POST = (url, callback) => /** @type {any} */(new RESTMethod("post", url, callback));

/**
 * Sets a controller PUT.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const PUT = (url, callback) => /** @type {any} */(new RESTMethod("put", url, callback));

/**
 * Sets a controller with a custom REST method.
 *
 * @template {(() => any)} T
 * @param {string} type - The HTTP method for the request.
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const REST = (type, url, callback) => /** @type {any} */(new RESTMethod(type, url, callback));

export default class Controller { }

export function shareToLoader(filepath, value) {
  if (global.loaders.shared[filepath]) return;
  global.loaders.shared[filepath] = value;
}
