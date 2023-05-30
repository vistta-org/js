import { indexOf, system } from "../utils";
import { State, Ref } from "./hooks";

const Fragment = Symbol("Fragment");
const StyleSheet = Symbol("StyleSheet");
const TextNode = Symbol("TextNode");

class Element {
  constructor({ key, ref, type, props, children, value }) {
    if (type == null) return null;
    this.type = type;
    if (key != null) this.key = key;
    if (ref != null) this.ref = ref;
    if (props != null) this.props = props;
    if (children != null) this.children = children;
    if (value != null) this.value = value;
  }
}

const createElement = (type, props, ...children) => {
  if (!props) props = {};
  if (typeof type === "function") {
    if (children?.length > 0) props.children = children;
    const element = type(props);
    if (Array.isArray(element)) return new Element({ type: Fragment, children: element });
    if (element && element instanceof State) return element;
    ({ type, props, children } = element || {});
    const { key, ref } = props || {};
    if (key) delete props.key;
    if (ref) delete props.ref;
    return new Element({ key, ref, type, props, children });
  }
  const { key, ref } = props || {};
  if (key) delete props.key;
  if (ref) delete props.ref;
  return new Element({ key, ref, type, props, children });
};

const createStyle = (stylesheet) => {
  const { id, value, hash } = stylesheet || {};
  if (!id || !value || !hash) return null;
  function Style({ children }) {
    children = applyScope(id, children);
    children.unshift(createElement(StyleSheet, {}, createScope(id, value)));
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
  #keys = {};
  stylesheets = [];
  children = [];

  constructor(node) {
    this.#node = node || document.body;
  }

  render(content, callback) {
    const fragment = document.createDocumentFragment();
    this.#content = this.#apply((child) => (fragment.append(child.node), this.#node), content);
    this.#node.replaceChildren(fragment);
    this.children = [...this.#node.children];
    callback && callback();
  }

  #apply(append, element) {
    if (!element == null) return null;
    if (typeof element === "function") return this.#apply(append, element());
    if (!(element instanceof Element)) {
      if (element instanceof State) {
        element = new Element({ type: Fragment, value: element });
        element.children = convertToArray(element);
        element.value.subscribe(() => this.#update(element));
      } else if (Array.isArray(element)) element = new Element({ type: Fragment, children: element });
      else element = new Element({ type: TextNode, value: `${element != null ? element : ""}` });
    }
    //
    const { key, ref, type, props, children, value } = element;
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = document.createTextNode(value);
      else if (type === StyleSheet) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(children?.[0] || "");
        this.stylesheets.push(sheet);
        document.adoptedStyleSheets = this.stylesheets;
        return element;
      } else if (type !== Fragment) element.node = document.createElement(type);
      else element.nodes = [];
      if (key) this.#keys[key] = element.node;
      if (ref) {
        const typeofRef = typeof ref;
        if (ref instanceof Ref) ref.register(element.node);
        else if (typeofRef === "function") ref(element.node);
        else if (typeofRef === "object") ref.current = element.node;
      }
      if (props) {
        const keys = Object.keys(props);
        for (let i = 0, len = keys?.length || 0; i < len; i++) {
          const name = keys[i],
            value = props[name];
          if (value && value instanceof State) value.subscribe(() => setAttribute(element.node, name, value));
          setAttribute(element.node, name, value);
        }
      }
      if (children) {
        const appendChild =
          type === Fragment
            ? (child) => {
                element.nodes.push(child.node);
                element.parent = append(child);
                return element.parent;
              }
            : (child) => {
                element.node.append(child.node);
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
    this.#apply((child) => (fragment.append(child.node), parent), element);
    // FUTURE: Improvement would be to remove multiple Nodes with one node commit
    const nextSibling = previous?.[previous.length - 1]?.nextSibling;
    for (let i = 0, len = previous.length; i < len; i++) previous[i].remove();
    if (nextSibling) parent.insertBefore(fragment, nextSibling);
    else parent.appendChild(fragment);
    if (parent === this.#node) this.children = [...this.#node.children];
  }
}

//

function convertToArray(element) {
  const value = element.value?.valueOf();
  return value instanceof Element && value.type === Fragment ? value.children : [value];
}

function setAttribute(node, name, value) {
  if (/on[A-Z].*/.test(name)) {
    if (typeof value !== "function") return;
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
    if (value.includes("@")) return value;
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
