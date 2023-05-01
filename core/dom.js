import { system, escapeHtml } from "@/utils";

export function createElement(type, props, ...children) {
  switch(typeof type) {
    case "object":
      return {};
    case "function":
      return type({ ...props, children });
    default:
      return { type, props, children };
  }
}

export function renderToString(dom) {
  let { type, props, children, unescaped } = dom || {};
  if(!type) return "";
  props = ((target) => {
    if(typeof target !== "object") return "";
    let result = "";
    Object.entries(target || {}).forEach(([prop, value]) => {
      if(["function", "object"].includes(typeof value) || value == null) return;
      result += ` ${prop}="${value}"`;
    });
    return result;
  })(props);
  children = ((target) => {
    if(typeof target !== "object" || !Array.isArray(target)) return "";
    return target.map(child => {
      if(typeof child === "string") return unescaped ? child : escapeHtml(child);
      return renderToString(child);
    }).join('');
  })(children);
  return `<${type}${props}>${children}</${type}>`
}

//

system.set("createElement", createElement);