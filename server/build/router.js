import { Router } from "../../core/router.js";
import { isValidUrl } from "../../utils/index.js";

class BuildRouter extends Router {
  #loaded = false;

  async navigate(arg) {
    if (!this.#loaded) {
      this.#loaded = true;
      return await super.navigate(arg);
    }
    let { href } = typeof arg === "object" ? arg : { href: arg };
    if (!href) return;
    window.location.href = isValidUrl(href)
      ? href
      : new URL(href, window.location.href).href;
  }

  refresh() {
    location.reload();
  }
}

export default new BuildRouter();
