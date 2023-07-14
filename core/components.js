import { useState, useEffect } from "./hooks";

export const Profiler = ({ id, children, callback }) => {
  const intial = performance.now();
  // eslint-disable-next-line no-undef
  return createElement(Fragment, null, children, () => callback({ id, duration: performance.now() - intial }));
};

// eslint-disable-next-line no-unused-vars
export const Suspense = ({ children, fallback }) => {
  const loaded = useState(false);
  return useEffect(() => {
    // eslint-disable-next-line sonarjs/no-redundant-boolean
    if (loaded == true) return children;
    setTimeout(() => loaded.set(true), 1);
    return fallback;
  }, [loaded]);
};

// eslint-disable-next-line no-unused-vars
/*export const Render = ({ if: renderIf, each: renderEach, children }) => {
  return null;
};*/

export const TryCatch = ({ children, fallback }) => {
  try {
    return children;
  } catch {
    return fallback;
  }
};
