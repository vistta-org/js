import { useState, State, CONTEXT, CONTEXT_KEY } from "./hooks";
import { isBrowser } from "../utils";

export const Profiler = ({ id, children, callback }) => {
  const intial = performance.now();
  // eslint-disable-next-line no-undef
  return createElement(Fragment, null, children, () => callback({ id, duration: performance.now() - intial }));
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

class Async extends State {}
export const async = (Component) => (props) => {
  const _async = new Async();
  const listeners = [];
  let value;
  Component(props).then((finishedComponent) => {
    value = finishedComponent;
    for (let i = 0, len = listeners.length; i < len; i++) listeners[i]();
  });
  _async.valueOf = () => value;
  _async.subscribe = (callback) => isBrowser() && listeners.push(callback);
  return _async;
};

export const context = (Component, _context) => (props) => {
  const keys = Object.keys(_context);
  for (let i = 0, len = keys.length; i < len; i++) CONTEXT[CONTEXT_KEY + keys[i]] = _context[keys[i]];
  const result = Component(props);
  for (let i = 0, len = keys.length; i < len; i++) delete CONTEXT[CONTEXT_KEY + keys[i]];
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
