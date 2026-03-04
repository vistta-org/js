import { isValidUrl } from "../../../utils/index.js";
import { Router } from "../router.js";

class BuildRouter extends Router {
  #loaded = false;

  /**
   * 
   * @typedef {Object} NavigateOptions
   * @property {string} [href] - The URL to navigate to. Can be a full URL or a relative path.
   * @property {boolean} [pushState] - Determines whether to use pushState (true) or replaceState (false) for history management. Defaults to true.
   * @property {boolean} [refresh] - If true, forces a refresh of the current page even if the URL hasn't changed. Defaults to false.
   * 
   * Navigates to a specified URL or updates the current page based on the provided options.
   * @param {string | NavigateOptions} [arg]
   */
  async navigate(arg) {
    if (!this.#loaded) {
      this.#loaded = true;
      return await super.navigate(arg);
    }
    let { href } = typeof arg === "object" ? arg : { href: arg };
    if (!href) return;
    window.location.href = isValidUrl(href) ? href : new URL(href, window.location.href).href;
  }

  /**
   * Refreshes the current page. If the `force` parameter is true, it will perform a full page reload. Otherwise, it will re-render the current page using the existing virtual DOM.
   * @returns {Promise<void>} A promise that resolves when the refresh operation is complete.
   */
  async refresh() {
    location.reload();
  }
}

export default new BuildRouter();
