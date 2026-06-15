export class Scheduler {
  /**
   * Schedules `fn` to fire every `intervalMs` milliseconds.
   *
   * **Android**: Timer persists in background via foreground service. Service auto-starts
   * on first call and stops when no timers remain.
   *
   * **Desktop/Web/iOS**: Falls through to `setInterval` with standard browser semantics
   * (no background persistence).
   *
   * @param {() => void} fn - Callback to invoke on each tick.
   * @param {number} intervalMs - Interval in milliseconds (minimum 1ms).
   * @returns {Promise<string | number | null>} Timer ID suitable for `clearBackgroundInterval`.
   * @throws {TypeError} If fn is not a function or intervalMs is not a valid number.
   */
  static async setBackgroundInterval(fn, intervalMs) {
    if (window.platform === "server") return null;
    if (window.platform === "browser") return /** @type {any} */ (setInterval(fn, intervalMs));
    try {
      const app = await import("@vistta/js-runtime/plugins");
      return await app.Scheduler.setBackgroundInterval(fn, intervalMs);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Cancels a timer registered with `setBackgroundInterval` or `setBackgroundTimeout`.
   *
   * On Android, also checks if service should be stopped (no remaining timers).
   *
   * @param {string | number} id - Timer ID from setBackgroundInterval/setBackgroundTimeout.
   */
  static async clearBackgroundInterval(id) {
    if (window.platform === "browser") return clearInterval(id);
    try {
      const app = await import("@vistta/js-runtime/plugins");
      return await app.Scheduler.clearBackgroundInterval(id);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Schedules `fn` to fire once after `delayMs` milliseconds.
   *
   * **Android**: One-shot timer with background persistence via foreground service.
   *
   * **Desktop/Web/iOS**: Falls through to `setTimeout` for best timing accuracy.
   *
   * Implemented internally as a one-shot timer using the interval machinery:
   * a single registration that fires once and auto-cancels.
   *
   * @param {() => void} fn - Callback to invoke once.
   * @param {number} delayMs - Delay in milliseconds (minimum 1ms).
   * @returns {Promise<string | number | null>} Timer ID suitable for `clearBackgroundTimeout`.
   * @throws {TypeError} If fn is not a function or delayMs is not a valid number.
   */
  static async setBackgroundTimeout(fn, delayMs) {
    if (window.platform === "server") return null;
    if (window.platform === "browser") return /** @type {any} */ (setTimeout(fn, delayMs));
    try {
      const app = await import("@vistta/js-runtime/plugins");
      return await app.Scheduler.setBackgroundTimeout(fn, delayMs);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Cancels a timer registered with `setBackgroundTimeout`.
   *
   * @param {string | number} id - Timer ID from setBackgroundTimeout.
   */
  static async clearBackgroundTimeout(id) {
    if (window.platform === "browser") return clearTimeout(id);
    try {
      const app = await import("@vistta/js-runtime/plugins");
      return await app.Scheduler.clearBackgroundTimeout(id);
    } catch {
      /* Do Nothing */
    }
  }
}
