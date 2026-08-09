/**
 * Bridges `window.visualViewport` dimensions into CSS so layouts adapt to the
 * soft keyboard on mobile WebViews (e.g. Android Tauri), where CSS `dvh`/`dvw`
 * units don't reliably update.
 *
 * Keeps `--viewport-height` / `--viewport-width` (in px) on `<html>` in sync via
 * the `visualViewport` `resize`/`scroll` events (with a window `resize` fallback).
 * The `html, body` sizing backed by these vars is applied by the per-route
 * VirtualStyleSheet when `config.viewport` contains `size=adaptive`, so the CSS
 * is scoped to adaptive routes rather than leaking globally.
 *
 * No-op on the server (window.platform === "server").
 */
let raf = 0;

/**
 * Installs the viewport-sync listeners. Idempotent; safe to call from any
 * client bootstrap. Does nothing on the server or when already installed.
 * Does not inject any CSS — the root sizing rule is owned by the
 * VirtualStyleSheet of the active route.
 */
export function setupAdaptiveViewport() {
  update();
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);
}

/**
 * Removes the viewport-sync listeners and clears the `--viewport-*` CSS vars.
 * Re-installing via {@link setupAdaptiveViewport} is possible afterwards.
 * No-op on the server or when not installed.
 */
export function teardownAdaptiveViewport() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  window.visualViewport?.removeEventListener("resize", update);
  window.visualViewport?.removeEventListener("scroll", update);
  window.removeEventListener("resize", update);
  window.removeEventListener("orientationchange", update);
  const style = document.documentElement.style;
  style.removeProperty("--viewport-height");
  style.removeProperty("--viewport-width");
}

function update() {
  if (raf) return;
  const style = document.documentElement.style;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const vv = window.visualViewport;
    if (
      !vv ||
      vv.scale !== 1 ||
      !(window.innerHeight - vv.height - vv.offsetTop > 2 || window.innerWidth - vv.width - vv.offsetLeft > 2)
    ) {
      style.removeProperty("--viewport-height");
      style.removeProperty("--viewport-width");
      return;
    }
    style.setProperty("--viewport-height", `${vv.height + vv.offsetTop}px`);
    style.setProperty("--viewport-width", `${vv.width + vv.offsetLeft}px`);
  });
}
