import { FunctionClass } from "../utils/index.js";

const global = /** @type {any} */ globalThis;

/**
 * @template T
 * @typedef {{ [K in keyof T]?: T[K] }} Optional
 */

/**
 * @template {((args: Record<string, any>) => any)} Callback
 * @typedef {((
 *   args?: Optional<Parameters<Callback>[0]>,
 *   options?: { controller?: AbortController; stream?: boolean; cache?: false | { force?: boolean } }
 * ) => Promise<Awaited<ReturnType<Callback>>>) & {
 *   url: (args?: Optional<Parameters<Callback>[0]>) => string,
 *   invalidate?: ((key?: Optional<Parameters<Callback>[0]>) => Promise<void>) & { all?: () => Promise<void> }
 * }} RESTMethodCallback
 */

export class RESTMethod extends FunctionClass {
  #type;
  #url;
  #options;

  get type() {
    return this.#type;
  }

  get url() {
    return this.#url;
  }

  get cache() {
    const c = this.#options?.cache;
    if (!c) return null;
    if (typeof c === "number") return { ttl: c, swr: false };
    return {
      ttl: c.ttl || 0,
      swr: !!c.swr,
    };
  }

  constructor(type, url, callback, options) {
    super(callback);
    this.#type = type;
    this.#url = url;
    this.#options = options;
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
export const COPY = (url, callback, options) => /** @type {any} */ (new RESTMethod("copy", url, callback, options));

/**
 * Sets a controller DELETE.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const DELETE = (url, callback, options) => /** @type {any} */ (new RESTMethod("delete", url, callback, options));

/**
 * Sets a controller GET.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const GET = (url, callback, options) => /** @type {any} */ (new RESTMethod("get", url, callback, options));

/**
 * Sets a controller MOVE.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const MOVE = (url, callback, options) => /** @type {any} */ (new RESTMethod("move", url, callback, options));

/**
 * Sets a controller PATCH.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const PATCH = (url, callback, options) => /** @type {any} */ (new RESTMethod("patch", url, callback, options));

/**
 * Sets a controller POST.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const POST = (url, callback, options) => /** @type {any} */ (new RESTMethod("post", url, callback, options));

/**
 * Sets a controller PUT.
 *
 * @template {(() => any)} T
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const PUT = (url, callback, options) => /** @type {any} */ (new RESTMethod("put", url, callback, options));

/**
 * Sets a controller with a custom REST method.
 *
 * @template {(() => any)} T
 * @param {string} type - The HTTP method for the request.
 * @param {string} url - The URL for the request.
 * @param {T} callback Options for the request.
 * @returns {RESTMethodCallback<T>} A promise that resolves to the response data.
 */
export const REST = (type, url, callback, options) => /** @type {any} */ (new RESTMethod(type, url, callback, options));

export default class Controller {
  /**
   * @type {string} Global host for the controller, used for constructing absolute URLs in the controller methods.
   */
  static set host(value) {
    console.warn(
      "Setting Controller.host on the server has no effect. This property is only used on the client to construct absolute URLs for API requests.",
    );
  }
}

export function shareToLoader(filepath, value) {
  if (global.loaders.shared[filepath]) return;
  global.loaders.shared[filepath] = value;
}
