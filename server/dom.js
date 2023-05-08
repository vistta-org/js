import { createElement as _createElement, Fragment } from "@/core/dom";
import { escapeHtml } from "@/utils";

export function renderToString(dom) {
  if (dom == null || typeof dom === 'boolean') return "";
  let { type, props, children, unescaped } = dom;
  if(type === "script" || type === "style") unescaped = true;
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
  if(typeof type === "symbol") return children;
  return `<${type}${props}>${children}</${type}>`
}

export function createElement(type, attributes, ...children) {
  const { unescaped, ...props } = attributes || {};
  const result = _createElement(type, props, ...children);
  if(typeof result === "object" && result) result.unescaped = unescaped;
  return result;
}