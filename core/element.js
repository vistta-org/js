import { Component } from "./classes";
import { system, camelCaseToKebabCase } from "../utils";
const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");

class Element {
  constructor(type, props, children) {
    this.type = type;
    this.props = props || {};
    this.children = children;
  }

  toString() {
    const children = this.children?.reduce((acc, cur) => acc + cur, "");
    return typeof this.type === "symbol" ? children : createElementString(this.type, this.props, children);
  }

  appendNode(node, referenceNode) {
    if (this.type === Fragment || this.type === Component.Node) {
      if (referenceNode) {
        let next = {};
        if (this.firstNode === node && this.firstNode !== this.lastNode)
          next.firstNode = this.firstNode.nextSibling;
        if (this.lastNode === node && this.firstNode !== this.lastNode)
          next.lastNode = this.lastNode.previousSibling;
        this.parent.appendNode(node, referenceNode);
        if (!this.firstNode || this.firstNode === node.nextSibling) this.firstNode = node;
        else if (next.firstNode) this.firstNode = next.firstNode;
        if (!this.lastNode || this.lastNode === node.previousSibling) this.lastNode = node;
        else if (next.lastNode) this.lastNode = next.lastNode;
      }
      else {
        if (this.firstNode === node && this.firstNode !== this.lastNode)
          this.firstNode = this.firstNode.nextSibling;
        else this.firstNode ||= node;
        this.lastNode = node;
        this.parent.appendNode(node);
      }
    }
    else if (this.type !== TextNode) {
      if (referenceNode) this.node.insertBefore(node, referenceNode);
      else this.node.appendChild(node);
    }
  }

  removeNode(node) {
    if (this.type === Fragment || this.type === Component.Node) {
      if (this.firstNode === node) {
        if (this.firstNode === this.lastNode)
          this.firstNode = null, this.lastNode = null;
        else this.firstNode = this.firstNode.nextSibling
      }
      else if (this.lastNode === node)
        this.lastNode = this.lastNode.previousSibling;
      this.parent.removeNode(node);
    }
    else if (this.type !== TextNode && this.node === node.parentNode)
      this.node.removeChild(node);
  }
}

function createElement(type, props, ...children) {
  if (type?.prototype instanceof Component) {
    const element = new Element(Component.Node, props);
    element.id = this?.id;
    element.props.children = children;
    if (typeof props?.key === "number") props.key = "" + props.key
    if (typeof props?.key === "string") (element.key = props.key), delete element.props.key;
    element.ref = type;
    return element;
  }
  const typeOf = typeof type;
  if (typeOf === "string" || typeOf === "symbol") {
    const element = new Element(type, props, children);
    if (type !== TextNode) element.id = this?.id;
    if (typeof props?.key === "number") props.key = "" + props.key
    if (typeof props?.key === "string") (element.key = props.key), delete element.props.key;
    if (props?.ref != null) (element.ref = props.ref), delete element.props.ref;
    return element;
  }
  return null;
}

function cloneElement(element, props, children) {
  if (!(element instanceof Element)) return null;
  if (props) {
    const { style, ...rest } = props || {};
    props = Object.assign(cloneProps(element.props), rest);
    props.style = Object.assign(props.style || {}, style || {});
  }
  else props = cloneProps(element.props);
  if (children === true) children = element?.children?.map((child) => child instanceof Element ? cloneElement(child, undefined, true) : child);
  return createElement.call(element.id, element.type, props, children);
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

function cloneProps(props) {
  const clone = (value) => {
    if (typeof value === "object") {
      if (Array.isArray(value)) {
        const cloned = [];
        for (let i = 0, len = value.length; i < len; i++)
          cloned[i] = clone(value[i]);
        return cloned;
      }
      else {
        const cloned = {};
        const keys = Object.keys(value);
        for (let i = 0, len = keys.length; i < len; i++)
          cloned[keys[i]] = clone(value[keys[i]]);
        return cloned;
      }
    }
    else return value;
  }
  return clone(props);
}

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