(() => {
  if (typeof window !== "undefined") return;
  global.window = global;
  const storage = { session: {}, local: {} };
  const readonly = { writable: false, configurable: false };
  Object.defineProperties(window, {
    isServer: { value: true, ...readonly },
    location: { value: { href: "" }, ...readonly },
    navigator: { value: { userAgent: "node.js" }, ...readonly },
    document: { value: { scripts: [] }, ...readonly },
    HTMLElement: { value: class {}, ...readonly },
    MutationObserver: { value: class {}, ...readonly },
    IntersectionObserver: { value: class {}, ...readonly },
    ResizeObserver: { value: class {}, ...readonly },
    localStorage: {
      value: {
        setItem: (key, value) => (storage.local[key] = value),
        getItem: (key) => storage.local[key],
        removeItem: (key) => delete storage.local[key],
        clear: () => (storage.local = {}),
      },
      ...readonly,
    },
    sessionStorage: {
      value: {
        setItem: (key, value) => (storage.session[key] = value),
        getItem: (key) => storage.session[key],
        removeItem: (key) => delete storage.session[key],
        clear: () => (storage.session = {}),
      },
      ...readonly,
    },
    addEventListener: { value: () => null, ...readonly },
    removeEventListener: { value: () => null, ...readonly },
    requestAnimationFrame: { value: () => null, ...readonly },
  });
})();
