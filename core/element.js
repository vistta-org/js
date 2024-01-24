import { Component } from "./components";
import { system, clone, camelCaseToKebabCase } from "../utils";

const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");
class Element {
  toString() {
    const children = this.children?.reduce((acc, cur) => acc + cur, "");
    return typeof this.type === "symbol" ? children : createElementString(this.type, this.props, children);
  }
}

const createElement = (type, props, ...children) => {
  switch (typeof type) {
    case "function":
      props = props || {};
      props.children = children;
      if (type?.prototype instanceof Component) return new type(props);
      var component = new Component();
      component.render = type.bind(component, props);
      return component;
    case "string":
    case "symbol":
      var element = new Element();
      element.type = type;
      element.props = props || {};
      if (props?.key) (element.key = props.key), delete element.props.key;
      if (props?.ref) (element.ref = props.ref), delete element.props.ref;
      element.children = children;
      return element;
    default:
      return null;
  }
};

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

export { Fragment, TextNode, Element, createElement, cloneElement, createElementString };

//

function styleToString(style) {
  const keys = Object.keys(style || {});
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const value = style[keys[i]];
    if (typeof value === "string") result += ` ${camelCaseToKebabCase(keys[i])}: ${value};`;
  }
  result = result.trim();
  return result === "" ? null : result;
}