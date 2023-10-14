import { system, clone, camelCaseToKebabCase } from "../utils";
import { State, INTERNAL, HOOK_CONTEXT, SCOPE_CONTEXT } from "./hooks";

const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");

class Element {
  constructor(type, props, children) {
    this.type = type;
    this.props = props || {};
    this.children = children;
  }

  toString() {
    if (this.type === TextNode) return this.children;
    const children = this.children?.reduce((acc, cur) => acc + cur, "");
    if (this.type === Fragment) return children;
    return createElementString(this.type, this.props, children);
  }
}

const createElement = (type, props, ...children) => {
  if (!type) return null;
  const typeOf = typeof type;
  if (typeOf === "function") {
    if (!props) props = {};
    if (children?.length > 0) props.children = children;
    const context = structuredClone(INTERNAL[HOOK_CONTEXT]);
    const scope = {};
    INTERNAL[SCOPE_CONTEXT] = scope;
    const node = type(props);
    INTERNAL[HOOK_CONTEXT] = context;
    const { effects } = scope;
    if (node instanceof Element || typeof node !== "object" || (node && node instanceof State))
      return effects ? Object.assign(new Element(Fragment, {}, [node]), { effects }) : node;
    if (Array.isArray(node))
      return effects ? Object.assign(new Element(Fragment, {}, node), { effects }) : new Element(Fragment, {}, node);
    if ("production" !== process.env.NODE_ENV && node instanceof Promise)
      console.warn("Async Components need to be wrapped in async function");
    return null;
  } else if (typeOf !== "string" && typeOf !== "symbol") return null;
  const element = new Element(type, props, children);
  if (element.props?.key) (element.key = element.props.key), delete element.props.key;
  if (element.props?.ref) (element.ref = element.props.ref), delete element.props.ref;
  return element;
};

const cloneElement = (element, children) => {
  if (!(element instanceof Element)) return null;
  return createElement(element.type, clone(element.props), children === true ? clone(element.children) : children);
}

const createElementString = (type, props, children) => {
  let propsString = "";
  const attr = Object.keys(props || {});
  for (let i = 0, len = attr.length; i < len; i++) {
    const name = attr[i];
    const value = name === "style" ? styleToString(props[name]) : props[name];
    if (["function", "object"].includes(typeof value) || value == null) continue;
    if (value === true) propsString += ` ${name}`;
    else propsString += ` ${name}="${value}"`;
  }
  return `<${type}${propsString}>${children}</${type}>`
}

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, TextNode, Element, createElement, cloneElement, createElementString };

//

function styleToString(style) {
  const keys = Object.keys(style || {});
  if (!keys.length) return null;
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const value = style[keys[i]];
    if (typeof value === "string") result += ` ${camelCaseToKebabCase(keys[i])}: ${value};`;
  }
  return result.trim();
}