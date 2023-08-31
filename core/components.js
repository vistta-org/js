import { useState, State, INTERNAL, HOOK_CONTEXT, PROFILER_CONTEXT } from "./hooks";

export const Profiler = ({ id, children, callback }) => {
  // eslint-disable-next-line no-undef
  if (!callback || "production" === process.env.NODE_ENV) return createElement(Fragment, null, children);
  const context = { count: 0 };
  const start = (initial) => {
    if (initial !== false) {
      INTERNAL[PROFILER_CONTEXT] = (_initial) => (_initial ? start(false) : end(false));
      context.performance = performance.now();
      return null;
    }
    if (context.count == 0) context.performance = performance.now();
    context.count++;
    return null;
  };
  const end = (initial) => {
    if (initial !== false) {
      INTERNAL[PROFILER_CONTEXT] = null;
      callback({ id, performance: performance.now() - (context.performance || 0) });
      return null;
    }
    context.count--;
    if (context.count === 0) callback({ id, performance: performance.now() - (context.performance || 0) });
    return null;
  };
  // eslint-disable-next-line no-undef
  return createElement(Fragment, { profiler: true }, createElement(start), ...children, createElement(end));
};

// eslint-disable-next-line no-unused-vars
export const Suspense = ({ children, fallback }) => {
  const loaded = useState(fallback);
  const asyncs = extractAsyncs(children);
  if (asyncs?.length > 0) {
    let readyCount = 0;
    const onReady = () => {
      readyCount++;
      if (asyncs.length === readyCount) setTimeout(() => loaded.set(children), 1);
    };
    for (let i = 0, len = asyncs.length; i < len; i++) asyncs[i].subscribe(onReady);
  } else setTimeout(() => loaded.set(children), 1);
  return loaded;
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

// Wrappers

class Async extends State {
  constructor(promise) {
    super(undefined, false);
    promise.then((Component) => super.set(Component));
  }

  set() {
    /* Do Nothing */
  }
}
export const async = (Component) => (props) => new Async(Component(props));

export const context = (Component, _context) => (props) => {
  const keys = Object.keys(_context);
  for (let i = 0, len = keys.length; i < len; i++) INTERNAL[HOOK_CONTEXT + keys[i]] = _context[keys[i]];
  const result = Component(props);
  for (let i = 0, len = keys.length; i < len; i++) delete INTERNAL[HOOK_CONTEXT + keys[i]];
  return result;
};

//

function extractAsyncs(_elements) {
  const asyncs = [];
  function recursive(elements) {
    if (!Array.isArray(elements)) elements = [elements];
    for (let i = 0, len = elements.length; i < len; i++) {
      const element = elements[i];
      if (element instanceof Async) asyncs.push(element);
      else if (element?.children?.length > 0) recursive(element.children);
    }
    return asyncs;
  }
  return recursive(_elements);
}
