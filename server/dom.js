import { Fragment, StyleSheet, TextNode, Element, createElement as _createElement } from "../core/dom";
import { State } from "../core/hooks";
import { escapeHtml, isProd, system } from "../utils";

system.set("MutationObserver", class {});
system.set("IntersectionObserver", class {});
system.set("ResizeObserver", class {});

function renderToString(element) {
  if (element == null) return "";
  if (!(element instanceof Element)) {
    if (element instanceof State) {
      element = new Element(Fragment, element);
      element.children = convertToArray(element);
    } else if (Array.isArray(element)) element = new Element(Fragment, null, element);
    else if (!element?.toString || typeof element === "function") {
      if (!isProd()) console.warn("Tried to render an invalid Element");
      return "";
    } else element = new Element(TextNode, null, "" + element);
  }
  //
  let { type, props, children, unescaped } = element;
  if (type === TextNode) return children;
  if (type === StyleSheet) type = "style";
  if (type === "script" || type === "style") unescaped = true;
  props = ((target) => {
    if (typeof target !== "object" || type === Fragment) return "";
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

function createElement(type, attributes, ...children) {
  const { unescaped, ...props } = attributes || {};
  const result = _createElement(type, props, ...children);
  if (typeof result === "object" && result) result.unescaped = unescaped;
  return result;
}

export { renderToString, createElement };

//

function convertToArray(element) {
  const value = element.value?.valueOf();
  return value instanceof Element && value.type === Fragment ? value.children : [value];
}

function convertProps(prop) {
  const curr = prop.toLowerCase();
  if (curr === "classname") return "class";
  return prop;
}
