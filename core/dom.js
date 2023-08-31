import { system } from "../utils";
import { State } from "./hooks";

const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");

class Element {
  constructor(type, props, children) {
    if (!type) return null;
    this.type = type;
    if (props?.key) (this.key = props.key), delete props.key;
    if (props?.ref) (this.ref = props.ref), delete props.ref;
    this.props = props || {};
    this.children = children;
  }

  transform() {
    if (!this.isFunctionElement) return null;
    if (this.children?.length > 0) this.props.children = this.children;
    const node = this.type(this.props);
    if (node instanceof Element) return node;
    if (typeof node !== "object" || (node && node instanceof State)) return node;
    if (Array.isArray(node)) return new Element(Fragment, null, node);
    if ("production" !== process.env.NODE_ENV && node instanceof Promise)
      console.warn("Async Components need to be wrapped in async function");
    return null;
  }

  get isFunctionElement() {
    return typeof this.type === "function";
  }
}

const createElement = (type, props, ...children) => new Element(type, props, children);

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, TextNode, Element, createElement };

//

export default class VirtualDom {
  #content;
  #store;
  #keys = {};
  #children = [];
  #css = {};

  body = document.body;
  head = document.head;
  style;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

  constructor(node, styles, store) {
    if (node === false) return this;
    else if (node) this.body = node;
    this.style = this.head.querySelector("style#route");
    if (!this.style) {
      this.style = this.createElement("style");
      this.head.appendChild(this.style);
    }
    this.#store = store;
    this.#css = styles?.reduce((res, { id, raw }) => ((res[id] = raw), res), {});
  }

  get store() {
    return this.#store;
  }

  render(content, callback) {
    const fragment = this.createDocumentFragment();
    this.#content = this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return this.body;
    }, content);
    this.body.replaceChildren(fragment);
    if (this.style?.styleSheet) this.style.styleSheet.cssText = Object.values(this.#css).join(" ");
    else this.style?.replaceChildren(this.createTextNode(Object.values(this.#css).join(" ")));
    this.#children = [...this.body.children];
    callback && callback();
  }

  replace(callback) {
    this.body.replaceChildren(...this.#children);
    if (this.style?.styleSheet) this.style.styleSheet.cssText = Object.values(this.#css).join(" ");
    else this.style?.replaceChildren(this.createTextNode(Object.values(this.#css).join(" ")));
    callback && callback();
  }

  #apply(append, element) {
    if (element == null || element === false) return append();
    if (!(element instanceof Element)) {
      if (element instanceof State) {
        element = new Element(Fragment, element);
        element.children = convertToArray(element);
        element.props.subscribe(() => this.#update(element));
      } else if (Array.isArray(element)) element = new Element(Fragment, null, element);
      else if (!element?.toString || typeof element === "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Tried to render an invalid Element"), console.log(element);
        return append();
      } else element = new Element(TextNode, null, "" + element);
    } else if (element.isFunctionElement) return this.#apply(append, element.transform());
    //
    const { type, key, ref, props, children } = element;
    if (props.scope) addScope(this.#css, props.scope);
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = this.createTextNode(children);
      else if (type !== Fragment) element.node = this.createElement(type);
      else element.nodes = [];
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (typeof ref === "object") ref.current = element.node;
      }
      if (type !== Fragment && props) {
        const keys = Object.keys(props);
        for (let i = 0, len = keys?.length || 0; i < len; i++) {
          const name = keys[i];
          const value = props[name];
          if (value && value instanceof State) value.subscribe(() => setAttribute(element.node, name, value));
          setAttribute(element.node, name, value);
        }
      }
      if (type !== TextNode && children) {
        const appendChild =
          type === Fragment
            ? (child) => {
                if (child?.node) {
                  element.nodes.push(child.node);
                  if (props.scope && child.type !== TextNode) setAttribute(child.node, "scope", props.scope);
                }
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

  async #update(element) {
    const fragment = this.createDocumentFragment();
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
    if (parent === this.body) this.#children = [...this.body.children];
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
  if (name === "scope") value = Object.keys(value).join(" ");
  if (!value) node.removeAttribute(name);
  else if (name === "style") Object.assign(node.style, value);
  else node.setAttribute(name, value);
}

function addScope(css, scope) {
  const keys = Object.keys(scope);
  for (let i = 0, len = keys.length; i < len; i++) {
    if (!css[keys[i]]) css[keys[i]] = scope[keys[i]];
  }
}
