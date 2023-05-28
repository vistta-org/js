import { Fragment, StyleSheet, TextNode, Element, createElement as _createElement } from "../core/dom";
import { State } from "../core/hooks";
import { escapeHtml, system } from "../utils";

system.set("MutationObserver", class {});

function renderToString(element) {
  if (!element == null) return "";
  if (typeof element === "function") return renderToString(element());
  if (!(element instanceof Element)) {
    if (element instanceof State) {
      element = new Element({ type: Fragment, value: element });
      element.children = convertToArray(element);
    } else if (Array.isArray(element)) element = new Element({ type: Fragment, children: element });
    else element = new Element({ type: TextNode, value: `${element != null ? element : ""}` });
  }
  //
  let { type, props, children, value, unescaped } = element;
  if (type === TextNode) return value;
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
