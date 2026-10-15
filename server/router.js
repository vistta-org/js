/* eslint-disable no-unused-vars */

export class Router {
  /**
   * Returns the current location object.
   * @returns {Location} The current location object.
   */
  static get location() {
    return window["page"]?.location ?? window.location;
  }

  /**
   *
   * @typedef {Object} NavigateOptions
   * @property {string} [href] - The URL to navigate to. Can be a full URL or a relative path.
   * @property {boolean} [pushState] - Determines whether to use pushState (true) or replaceState (false) for history management. Defaults to true.
   * @property {boolean} [refresh] - If true, forces a refresh of the current page even if the URL hasn't changed. Defaults to false.
   * @property {boolean} [force] - If true, forces a full page load instead of using the virtual DOM for navigation. Defaults to false.
   * @property {string} [transition] - The view transition type to use (e.g. "slide-left", "slide-right", "slide-up", "slide-down"). Overrides the page config transition.
   *
   * Navigates to a specified URL or updates the current page based on the provided options.
   * @param {string | NavigateOptions} [arg]
   * @param {NavigateOptions} [options]
   */
  static async navigate(arg, options = {}) {
    throw new Error("Router is not available on server environment.");
  }

  /**
   * Refreshes the current page. If the `force` parameter is true, it will perform a full page reload. Otherwise, it will re-render the current page using the existing virtual DOM.
   * @param {boolean} [force=false] - If true, forces a full page reload. If false, re-renders the current page using the existing virtual DOM. Defaults to false.
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete.
   */
  static refresh(force) {
    throw new Error("Router is not available on server environment.");
  }

  /**
   * Emits a custom event on the document body with the specified name and details.
   * @param {string} event
   * @param {any} [details]
   */
  static emit(event, details) {
    throw new Error("Router is not available on server environment.");
  }

  /**
   * Registers an event listener for the specified event on the document body.
   * @param {string} event
   * @param {(event: any) => void} callback
   */
  static on(event, callback) {
    throw new Error("Router is not available on server environment.");
  }

  /**
   * Unregisters an event listener for the specified event on the document body.
   * @param {string} event
   * @param {(event: any) => void} callback
   */
  static off(event, callback) {
    throw new Error("Router is not available on server environment.");
  }
}

export default Router;
