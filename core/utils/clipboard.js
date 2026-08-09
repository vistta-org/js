export class Clipboard {
  /**
   * Write plain text to the clipboard.
   * @param {string} text - The text to write.
   * @returns {Promise<void>}
   */
  static async writeText(text) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      if (navigator.clipboard) await navigator.clipboard.writeText(text);
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      await Clipboard.writeText(text);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Read plain text from the clipboard.
   * @returns {Promise<string>} The clipboard text content.
   */
  static async readText() {
    if (window.platform === "server") return "";
    if (window.platform === "browser") {
      if (navigator.clipboard) return await navigator.clipboard.readText();
      return "";
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      return await Clipboard.readText();
    } catch {
      return "";
    }
  }

  /**
   * Write HTML content to the clipboard, with a plain-text fallback.
   * @param {string} html - The HTML content to write.
   * @param {string} [altText] - Plain-text fallback. Defaults to the raw HTML string.
   * @returns {Promise<void>}
   */
  static async writeHtml(html, altText) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const text = altText ?? html;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([html], { type: "text/html" }),
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]);
          return;
        } catch {
          /* Fall back to writeText below */
        }
      }
      if (navigator.clipboard) await navigator.clipboard.writeText(altText ?? html);
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      await Clipboard.writeHtml(html, altText);
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Write an image to the clipboard.
   * @param {Uint8Array | ArrayBuffer | Blob | number[]} image - The image data to write.
   * @returns {Promise<void>}
   */
  static async writeImage(image) {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        const blob = image instanceof Blob ? image : new Blob([/** @type {any} */ (image)], { type: "image/png" });
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        } catch {
          /* Do Nothing */
        }
      }
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      const data = image instanceof Blob ? await image.arrayBuffer() : image;
      await Clipboard.writeImage(/** @type {any} */ (data));
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Read an image from the clipboard.
   * @returns {Promise<Blob | null>} The clipboard image as a Blob, or null if no image is present.
   */
  static async readImage() {
    if (window.platform === "server") return null;
    if (window.platform === "browser") {
      if (navigator.clipboard?.read && typeof ClipboardItem !== "undefined") {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const type = item.types.find((t) => t.startsWith("image/"));
            if (type) return await item.getType(type);
          }
        } catch {
          /* Do Nothing */
        }
      }
      return null;
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      const image = await Clipboard.readImage();
      if (!image) return null;
      const rgba = await image.rgba();
      return new Blob([new Uint8Array(rgba)], { type: "image/png" });
    } catch {
      return null;
    }
  }

  /**
   * Clear the clipboard contents.
   * @returns {Promise<void>}
   */
  static async clear() {
    if (window.platform === "server") return;
    if (window.platform === "browser") {
      if (navigator.clipboard) await navigator.clipboard.writeText("");
      return;
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      await Clipboard.clear();
    } catch {
      /* Do Nothing */
    }
  }

  /**
   * Reads and emits the focused Android clipboard through the active watcher.
   * No-op on platforms without the native runtime bridge.
   */
  static async syncClipboard() {
    if (window.platform !== "mobile") return false;
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      return Clipboard.syncClipboard() === true;
    } catch {
      return false;
    }
  }

  /**
   * Watches the system clipboard and invokes `onClip` whenever the content
   * changes. On Android, Shizuku/Sui is selected automatically when already
   * authorized; otherwise the fallback polls while Vistta is foregrounded.
   *
   * @param {(text: string) => void} onClip - Called with the new clipboard text.
   * @param {number} [pollIntervalMs=2000] - Poll interval for the fallback path.
   * @returns {Promise<() => void>} A dispose function that stops the watcher.
   */
  static async watchBackground(onClip, pollIntervalMs = 2000) {
    if (window.platform === "server") return () => {};
    if (window.platform === "browser") {
      // Browser: poll navigator.clipboard.readText() on setInterval.
      let stopped = false;
      let last = "";
      const id = setInterval(async () => {
        if (stopped) return;
        try {
          const text = await navigator.clipboard.readText();
          if (text && text !== last) {
            last = text;
            onClip(text);
          }
        } catch {
          /* Do Nothing */
        }
      }, pollIntervalMs);
      return () => {
        stopped = true;
        clearInterval(id);
      };
    }
    // Native (mobile/desktop)
    try {
      const { Clipboard } = await import("@vistta/js-runtime/plugins");
      return Clipboard.watchBackground(onClip, pollIntervalMs);
    } catch {
      return () => {};
    }
  }
}
