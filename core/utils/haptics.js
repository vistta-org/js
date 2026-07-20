export class Haptics {
  /**
   * Trigger a haptic impact feedback.
   * @param {number} intensity - The intensity of the impact, from 0 to 100 [default: 20].
   */
  static async vibrate(intensity = 20) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      if (navigator.vibrate) navigator.vibrate(intensity);
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Haptics } = await import("@vistta/js-runtime/plugins");
      await Haptics.vibrate(intensity);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Trigger a haptic notification feedback.
   * @param {"success" | "warning" | "error"} type - The type of notification feedback.
   * "success" triggers a short vibration, "warning" triggers a pattern of vibrations, and "error" triggers a long vibration.
   */
  static async notificationFeedback(type) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      const pattern = type === "success" ? [50] : type === "warning" ? [30, 50, 30] : [100];
      if (navigator.vibrate) navigator.vibrate(pattern);
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Haptics } = await import("@vistta/js-runtime/plugins");
      await Haptics.notificationFeedback(type);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Trigger a haptic impact feedback.
   * @param {"light" | "medium" | "heavy"} style - The style of impact feedback, where "light" is a short vibration, "medium" is a medium vibration, and "heavy" is a long vibration.
   * Defaults to "medium" if not specified or if an invalid value is provided.
   */
  static async impactFeedback(style) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      const pattern = style === "light" ? [20] : style === "heavy" ? [100] : [50];
      if (navigator.vibrate) navigator.vibrate(pattern);
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Haptics } = await import("@vistta/js-runtime/plugins");
      await Haptics.impactFeedback(style);
    } catch {
      /* Do Nothing */
    }
  }
}
