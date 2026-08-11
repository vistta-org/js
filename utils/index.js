export const defineReadonly = (obj, key, value) =>
  Object.defineProperty(obj, key, {
    value,
    writable: false,
    configurable: false,
  });

export const noCache = (path) => path + `?noCache=${Date.now()}`;

export class FunctionClass extends Function {
  // @ts-ignore
  constructor(f) {
    return Object.setPrototypeOf(f, new.target.prototype);
  }
}

export function convertCSP(
  target,
  fallback = {
    "style-src": ["'unsafe-inline'"],
    "img-src": ["data:"],
  },
) {
  const csp = Object.assign({}, fallback);
  const typeOf = typeof target;
  if (typeOf === "string") {
    const directives = target.split(";");
    target = {};
    for (let i = 0, len = directives.length; i < len; i++) {
      const directive = directives[i].trim();
      if (directive === "") continue;
      const [key, ...values] = directive.split(" ").map((v) => v.trim());
      if (key && values.length) target[key] = values;
    }
  } else if (typeOf !== "object") target = {};
  const keys = Array.from(new Set([...Object.keys(csp), ...Object.keys(target)]));
  if (keys.length === 0) return fallback;
  let result = "default-src 'self'; ";
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    if (key === "default-src") continue;
    const value = ["'self'"];
    if (csp[key]) value.push(...(!Array.isArray(csp[key]) ? csp[key].split(" ") : csp[key]));
    if (target[key]) value.push(...(!Array.isArray(target[key]) ? target[key].split(" ") : target[key]));
    result += key + " " + Array.from(new Set(value)).join(" ") + "; ";
  }
  return result;
}

export * from "@vistta/utils";
export * from "./router.js";
export * from "./string.js";
