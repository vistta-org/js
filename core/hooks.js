const context = {};

// Ref

export class Ref {
  current;

  constructor(initialValue) {
    this.current = initialValue;
  }
}

export function useRef(initialValue) {
  return new Ref(initialValue);
}

// State

export class State {}
export function useState(value) {
  const listeners = [];
  const state = new State();
  state.set = (x) => {
    if (value === x) return;
    if (typeof x === "function") value = x(value);
    else value = x;
    setTimeout(() => {
      for (let i = 0, len = listeners.length; i < len; i++) listeners[i]();
    }, 0);
  };
  state.valueOf = () => {
    if (typeof context?.effect === "function") context.effect(state);
    return value;
  };
  state.toString = () => {
    if (typeof context?.effect === "function") context.effect(state);
    if (value == null || typeof value === "object") return "";
    return `${value}`;
  };
  state.subscribe = (callback) => listeners.push(callback);
  return state;
}

// Effect

class Effect extends State {}
export function useEffect(callback, dependencies) {
  const effect = new Effect();
  const autoDetect = !Array.isArray(dependencies);
  const listeners = [];
  let value;
  if (autoDetect) {
    dependencies = [];
    context.effect = (dependency) => dependencies.push(dependency);
    value = callback();
    delete context.effect;
  } else value = callback();
  for (let i = 0, len = dependencies.length; i < len; i++) {
    const dependency = unique(dependencies, i);
    if (dependency)
      dependency.subscribe(() => {
        value = callback();
        for (let n = 0, nlen = listeners.length; n < nlen; n++) listeners[n]();
      });
  }
  effect.valueOf = () => value;
  effect.toString = () => {
    if (value == null || typeof value === "object") return "";
    return `${value}`;
  };
  effect.subscribe = (callback) => listeners.push(callback);
  return effect;
}

//

function unique(dependencies, index) {
  const cur = dependencies[index];
  if (!(cur instanceof State)) return null;
  for (let i = 0; i < index; i++) {
    if (dependencies[i] === cur) return null;
  }
  return cur;
}
