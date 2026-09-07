import { createDomMutation, Mutation } from "./mutation.js";

export function spreadProps(caller) {
  const previous = Mutation.current;
  Mutation.current = null;
  let obj;
  try {
    obj = caller();
  } finally {
    Mutation.current = previous;
  }
  const result = {};
  const keys = Object.keys(obj);
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    result[key] = createDomMutation(() => caller()[key]);
  }
  return result;
}
