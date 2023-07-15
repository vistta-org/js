import { indexOf, system } from "../utils";
import { State } from "./hooks";

const Fragment = Symbol("Fragment");
const StyleSheet = Symbol("StyleSheet");
const TextNode = Symbol("TextNode");
// const AsyncNode = Symbol("AsyncNode");

class Element {
  constructor(type, props, children) {
    this.type = type;
    this.props = props;
    this.children = children;
  }
}
const createElement = (type, props, ...children) => {
  if (!type) return null;
  if (typeof type === "function") {
    if (!props) props = {};
    if (children?.length > 0) props.children = children;
    const node = type(props);
    if (node instanceof Promise) {
      console.warn("Async Components need to be wrapped in async function");
      return null;
    }
    if (node && node instanceof State) return node;
    if (Array.isArray(node)) return new Element(Fragment, null, node);
    ({ type, props, children } = node || {});
  }
  const element = new Element(type, props, children);
  if (element.props?.key) (element.key = element.props.key), delete element.props.key;
  if (element.props?.ref) (element.ref = element.props.ref), delete element.props.ref;
  return element;
};

const createStyle = (stylesheet) => {
  const { id, value, hash } = stylesheet || {};
  if (!id || !value || !hash) return null;
  function Style({ children }) {
    children = applyScope(id, children);
    children.unshift(createElement(StyleSheet, { key: id }, createScope(id, value)));
    return children;
  }
  Style.value = value;
  return Style;
};

system.set("Fragment", Fragment);
system.set("createElement", createElement);
system.set("createStyle", createStyle);

export { Fragment, StyleSheet, TextNode, Element, createElement };

//

export default class VirtualDom {
  #node;
  #content;
  #style;
  #store;
  #keys = {};
  #children = [];
  #css = "";

  constructor(node, styles, store) {
    if (!node) return this;
    this.#node = node || document.body;
    this.#style = document.querySelector("head > style#route");
    if (!this.#style) {
      this.#style = document.createElement("style");
      document.head.appendChild(this.#style);
    }
    this.#store = store;
    this.#css = styles?.reduce((acc, { value }) => acc + " " + value, "");
  }

  get store() {
    return this.#store;
  }

  render(content, callback) {
    const fragment = document.createDocumentFragment();
    this.#content = this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return this.#node;
    }, content);
    this.#node.replaceChildren(fragment);
    if (this.#style.styleSheet) this.#style.styleSheet.cssText = this.#css;
    else this.#style.replaceChildren(document.createTextNode(this.#css));
    this.#children = [...this.#node.children];
    callback && callback();
  }

  replace(callback) {
    this.#node.replaceChildren(...this.#children);
    if (this.#style.styleSheet) this.#style.styleSheet.cssText = this.#css;
    else this.#style.replaceChildren(document.createTextNode(this.#css));
    callback && callback();
  }

  #apply(append, element) {
    if (element == null) return append();
    if (!(element instanceof Element)) {
      if (element instanceof State) {
        element = new Element(Fragment, element);
        element.children = convertToArray(element);
        element.props.subscribe(() => this.#update(element));
      } else if (Array.isArray(element)) element = new Element(Fragment, null, element);
      else if (!element?.toString || typeof element === "function") {
        console.warn("Tried to render an invalid Element");
        return append();
      } else element = new Element(TextNode, null, "" + element);
    }
    //
    const { type, key, ref, props, children } = element;
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = document.createTextNode(children);
      else if (type === StyleSheet) {
        this.#css += ` ${children?.[0] || ""}`;
        return element;
      } else if (type !== Fragment) element.node = document.createElement(type);
      else element.nodes = [];
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (typeof ref === "object") ref.current = element.node;
      }
      if (type !== Fragment && props) {
        const keys = Object.keys(props);
        for (let i = 0, len = keys?.length || 0; i < len; i++) {
          const name = keys[i],
            value = props[name];
          if (value && value instanceof State) value.subscribe(() => setAttribute(element.node, name, value));
          setAttribute(element.node, name, value);
        }
      }
      if (type !== TextNode && children) {
        const appendChild =
          type === Fragment
            ? (child) => {
                if (child?.node) element.nodes.push(child.node);
                element.parent = append(child);
                return element.parent;
              }
            : (child) => {
                if (child?.node) element.node.append(child.node);
                return element.node;
              };
        for (let i = 0, len = children?.length || 0; i < len; i++)
          element.children[i] = this.#apply(appendChild, children[i]);
      }
    } else element.node = this.#keys[key];
    if (type !== Fragment) element.parent = append(element);
    return element;
  }

  #update(element) {
    const fragment = document.createDocumentFragment();
    const previous = element?.nodes || [];
    const parent = element.parent;
    element.children = convertToArray(element);
    this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return parent;
    }, element);
    // FUTURE: Improvement would be to remove multiple Nodes with one node commit
    const nextSibling = previous?.[previous.length - 1]?.nextSibling;
    for (let i = 0, len = previous.length; i < len; i++) previous[i].remove();
    if (nextSibling) parent.insertBefore(fragment, nextSibling);
    else parent.appendChild(fragment);
    if (parent === this.#node) this.#children = [...this.#node.children];
  }
}

//

function convertToArray(element) {
  const value = element.props?.valueOf();
  return value instanceof Element && value.type === Fragment ? value.children : [value];
}

function setAttribute(node, name, value) {
  if (/^on\w.*/.test(name) && typeof value === "function") {
    node.addEventListener(name.charAt(2).toLowerCase() + name.slice(3), value);
    return;
  }
  if (name === "className") name = "class";
  if (!value) node.removeAttribute(name);
  else if (name === "style") Object.assign(node.style, value);
  else node.setAttribute(name, value);
}

function createScope(id, code) {
  const regex = /([^{}\s][^{}]*)\s*(?=\{)/g;
  const add = (value) => {
    const index = indexOf(value, " ", ">", ":");
    if (index === -1) return value + `[scope~="${id}"]`;
    return value.slice(0, index) + `[scope~="${id}"]` + value.slice(index);
  };
  const replacer = (value) => {
    if (value.includes("@") || value.includes("%")) return value;
    if (value.includes(","))
      return value
        .split(",")
        .reduce((acc, c) => `${acc}${add(c)},`, "")
        .slice(0, -1);
    return add(value);
  };
  return code.match(regex) ? code.replace(regex, (v) => replacer(v.trim())) : code;
}

function applyScope(scope, target) {
  if (!target || typeof target !== "object") return target;
  if (Array.isArray(target)) {
    for (let i = 0, len = target.length; i < len; i++) target[i] = applyScope(scope, target[i]);
    return target;
  }
  const { type, children } = target;
  if (type === Fragment) return applyScope(scope, children);
  target.props.scope = scope;
  return target;
}
