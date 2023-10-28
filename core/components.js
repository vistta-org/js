/* eslint-disable no-undef */
import { useState, State, INTERNAL, PROFILER_CONTEXT } from "./hooks";
import { isServer, setImmediate } from "../utils";

class ProfileRecorder extends State {
  #callback;

  constructor(callback) {
    super(undefined, false);
    this.#callback = callback;
  }

  set() {
    /* Do Nothing */
  }

  valueOf() {
    return this.#callback(), null;
  }

  subscribe() {
    /* Do Nothing */
  }
}

export const Profiler = ({ id, children, callback }) => {
  if (!callback || isServer() || "production" === process.env.NODE_ENV) return createElement(Fragment, null, children);
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
  return createElement(Fragment, null, new ProfileRecorder(start), ...children, new ProfileRecorder(end));
};

export const Suspense = ({ children, fallback }) => {
  const loaded = useState(fallback);
  const asyncs = extractAsyncs(children);
  if (asyncs?.length > 0) {
    let readyCount = 0;
    const onReady = () => {
      readyCount++;
      if (asyncs.length === readyCount) setImmediate(() => loaded.set(children));
    };
    for (let i = 0, len = asyncs.length; i < len; i++) asyncs[i].subscribe(onReady);
  } else setImmediate(() => loaded.set(children));
  return loaded;
};

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
