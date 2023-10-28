import { system, clone, camelCaseToKebabCase } from "../utils";
import { State, INTERNAL, HOOK_CONTEXT, SCOPE_CONTEXT } from "./hooks";

const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");
class Element { }
class Component { }

const createElement = (type, props, ...children) => {
  const typeOf = typeof type;
  if (typeOf === "function") {
    const component = new Component();
    props = props || {};
    props.children = children;
    component.call = type.bind(null, props);
    return component;
  }
  if (typeOf === "string" || typeOf === "symbol") {
    const element = new Element();
    element.type = type;
    element.props = props || {};
    if (props?.key) (element.key = props.key), delete element.props.key;
    if (props?.ref) (element.ref = props.ref), delete element.props.ref;
    element.children = children;
    return element;
  }
  return null;
};

const convertToElement = (target) => {
  if (target instanceof Component) {
    const context = structuredClone(INTERNAL[HOOK_CONTEXT]);
    const scope = {};
    INTERNAL[SCOPE_CONTEXT] = scope;
    target = target.call();
    INTERNAL[HOOK_CONTEXT] = context;
    if (scope?.effects) {
      const element = new Element();
      element.type = Fragment;
      element.props = {};
      element.children = Array.isArray(target) ? target : [target];
      element.effects = scope.effects;
      return element;
    }
    return target && convertToElement(target);
  }
  //
  if (target instanceof Element) return target;
  const element = new Element();
  element.type = Fragment;
  element.props = {};
  if (target instanceof State) element.props = target, element.children = [target?.valueOf()];
  else if (Array.isArray(target)) element.children = target;
  else if (target instanceof Promise)
    return elementException("Async Components need to be wrapped in async function");
  else if (!target?.toString || typeof target === "function")
    return elementException("Tried to render an invalid Element");
  else element.type = TextNode, element.children = "" + target;
  return element;
}

const cloneElement = (element, props, children) => {
  if (!(element instanceof Element)) return null;
  if (props) {
    const { style, ...rest } = props || {};
    props = Object.assign(clone(element.props), rest);
    props.style = Object.assign(props.style || {}, style || {});
  }
  else props = clone(element.props);
  if (children === true) children = element?.children?.map((child) => child instanceof Element ? cloneElement(child, undefined, true) : child);
  return createElement(element.type, props, children);
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
  return `<${type}${propsString}>${children}</${type}>`;
}

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, TextNode, Element, createElement, convertToElement, cloneElement, createElementString };

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

function elementException(exception) {
  if ("production" !== process.env.NODE_ENV) console.warn(exception);
  return false;
}