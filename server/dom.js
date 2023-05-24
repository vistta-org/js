import { createElement as _createElement, Fragment, StyleSheet } from "@/core/dom";
import { escapeHtml, system } from "@/utils";

system.set("MutationObserver", class {});

export function renderToString(dom) {
  if (dom == null || typeof dom === "boolean") return "";
  let { type, props, children, unescaped } = dom;
  if (type === StyleSheet) type = "style";
  if (type === "script" || type === "style") unescaped = true;
  props = ((target) => {
    if (typeof target !== "object") return "";
    let result = "";
    Object.entries(target || {}).forEach(([prop, value]) => {
      if (["function", "object"].includes(typeof value) || value == null) return;
      result += ` ${convertProps(prop)}="${value}"`;
    });
    return result;
  })(props);
  children = ((target) => {
    if (typeof target !== "object" || !Array.isArray(target)) return "";
    return target
      .map((child) => {
        if (typeof child === "string") return unescaped ? child : escapeHtml(child);
        return renderToString(child);
      })
      .join("");
  })(children);
  if (type === Fragment) return children;
  return `<${type}${props}>${children}</${type}>`;
}

export function createElement(type, attributes, ...children) {
  const { unescaped, ...props } = attributes || {};
  const result = _createElement(type, props, ...children);
  if (typeof result === "object" && result) result.unescaped = unescaped;
  return result;
}

function convertProps(prop) {
  const curr = prop.toLowerCase();
  if (curr === "classname") return "class";
  return prop;
}
