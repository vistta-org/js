export class Notification {
  /**
   * Request permission to display notifications.
   * @returns {Promise<"granted" | "denied">} The permission state.
   */
  static async request() {
    if (window.platform === "server") return "denied";
    if (window.platform === "browser")
      return (await window.Notification.requestPermission()) === "granted" ? "granted" : "denied";
    try {
      const app = await import("@vistta/js-runtime/plugins");
      return (await app.Notification.requestPermission()) === "denied" ? "denied" : "granted";
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Send a system notification.
   * @param {Object} [options={}] - Notification content.
   * @param {string} [options.title] - Notification title.
   * @param {string} [options.body] - Notification body text.
   * @returns {Promise<void>}
   */
  static async send(options = {}) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      new window.Notification(options.title, { body: options.body });
      return;
    }
    try {
      const app = await import("@vistta/js-runtime/plugins");
      await app.Notification.sendNotification(/** @type {any} */ (options));
    } catch {
      /* Do Nothing */
    }
  }
}
