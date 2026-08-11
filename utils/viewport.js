/**
 * Bridges `window.visualViewport` dimensions into CSS so layouts adapt to the
 * soft keyboard on mobile WebViews (e.g. Android Tauri), where CSS `dvh`/`dvw`
 * units don't reliably update.
 *
 * While installed, continuously mirrors `visualViewport` into
 * `--viewport-height` / `--viewport-width` (size, px) on `<html>` via the
 * `visualViewport` `resize`/`scroll` events (with a window `resize` fallback).
 * The vars are always present while the bridge is active — they are only
 * removed on teardown — so the layout always tracks the actually-visible
 * region and never falls back to the non-shrinking `dvh`/`dvw` units mid-
 * interaction (which would let the body exceed the visible area and become
 * scrollable). The `min(100%, 100dvh)` fallback in the consuming CSS makes the
 * no-keyboard frame identical to the default, so publishing the full-viewport
 * value when no keyboard is present is harmless.
 *
 * The `html, body` sizing backed by these vars is applied by the per-route
 * VirtualStyleSheet when `config.viewport` contains `size=adaptive`, so the CSS
 * is scoped to adaptive routes rather than leaking globally.
 *
 * No-op on the server (window.platform === "server").
 */
const ORIENTATION_SETTLE_FRAMES = 60;

let raf = 0;
let orientationFrames = 0;

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
  window.addEventListener("orientationchange", settleOrientation);
}

/**
 * Removes the viewport-sync listeners and clears the `--viewport-*` CSS vars.
 * Re-installing via {@link setupAdaptiveViewport} is possible afterwards.
 * No-op on the server or when not installed.
 */
export function teardownAdaptiveViewport() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  orientationFrames = 0;
  window.visualViewport?.removeEventListener("resize", update);
  window.visualViewport?.removeEventListener("scroll", update);
  window.removeEventListener("resize", update);
  window.removeEventListener("orientationchange", settleOrientation);
  const style = document.documentElement.style;
  style.removeProperty("--viewport-height");
  style.removeProperty("--viewport-width");
}

function settleOrientation() {
  orientationFrames = ORIENTATION_SETTLE_FRAMES;
  update();
}

function update() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const vv = window.visualViewport;
    // Android may settle rotation a fraction away from 1 due to rounding.
    // Accept that noise, but ignore actual zoom so it never resizes the document.
    if (vv && Math.abs(vv.scale - 1) < 0.01) {
      const style = document.documentElement.style;
      style.setProperty("--viewport-height", `${vv.height}px`);
      style.setProperty("--viewport-width", `${vv.width}px`);
    }
    if (orientationFrames > 0) {
      orientationFrames--;
      update();
    }
  });
}
