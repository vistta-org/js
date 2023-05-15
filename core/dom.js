import { system } from "@/utils";
import { State } from "./state";

export default class VirtualDom {
  #node;
  #content;

  constructor(node) {
    this.#node = node || document.body;
  }

  render(content, callback) {
    const node = this.#node.cloneNode();
    this.#content = apply({ node }, content);
    this.#node.replaceWith(node);
    this.#node = node;
    console.log("Rendered Dom:", this.#content);
    callback && callback();
  }
}

//

const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");
const UnkownNode = Symbol("UnkownNode");

class Element {
  constructor({ type, key, ref, props, children, value }) {
    this.type = type;
    if (typeof type === "string") {
      if (key) this.key = key;
      if (ref) this.ref = ref;
    }
    if (value) this.value = value;
    if (props) this.props = props;
    if (children) this.children = children;
  }
}

const createElement = (type, attributes, ...children) => {
  const { key, ref, ...props } = attributes || {};
  //
  if (typeof type === "string") return new Element({ key, ref, type, props, children });
  if (typeof type === "function") return new Element({ key, ref, ...type({ ...props, children }) });
  if (type === Fragment) return new Element({ type, children });
  return null;
};

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, createElement };

//

function apply(parent, element, previous) {
  if (!element == null) return null;
  if (typeof element === "function") return apply(parent, element());
  if (!(element instanceof Element)) {
    if (element?.toString == null) return null;
    element = new Element({ type: element instanceof State ? UnkownNode : TextNode, value: element });
  }
  //
  element.parent = parent;
  if (previous) element.previous = previous;
  if (typeof element.type === "symbol") {
    if (element.type === TextNode) element.node = document.createTextNode(element?.value || "");
    else if (element.type === UnkownNode && element?.value instanceof State) {
      const value = element.value?.valueOf();
      if (value instanceof Element) {
        element.type = Fragment;
        element.children = value.type === Fragment ? value.children : [value];
        element.value.subscribe(() => update(element));
      } else {
        element.type = TextNode;
        element.node = document.createTextNode(value || "");
        element.value.subscribe(() => update(element));
      }
    }
  } else element.node = document.createElement(element.type);
  if (element.node) element.node.__virtual_dom = element;
  //
  if (element.type !== TextNode) {
    const set = (name, value) => {
      if (/on[A-Z].*/.test(name)) {
        if (typeof value !== "function") return;
        element.node.addEventListener(name.charAt(2).toLowerCase() + name.slice(3), value);
      }
      if (!value) element.node.removeAttribute(name);
      else if (value === true) element.node.setAttribute(name, "");
      else element.node.setAttribute(name, value);
      if (value instanceof State) value.subscribe(() => set(name, value));
    };
    Object.entries(element.props || {}).forEach(([name, value]) => set(name, value));
  }
  if (element.children)
    element.children = element.children.map((child, index, array) => apply(element, child, array?.[index - 1]));
  //
  const append = (parent, element) => {
    if (!element.node || !parent) return element;
    if (!parent?.node) return append(parent?.parent, element);
    parent.node.appendChild(element.node);
    return element;
  };
  return append(parent, element);
}

function update(element) {
  const newValue = element.value?.valueOf();
  if (element.type === TextNode && !(newValue instanceof Element)) return (element.node.nodeValue = newValue);
  //
  console.log(element);
  /*const clearTree = (curr) => {
    let previousSibiling;
    if (curr?.node) {
      previousSibiling = curr.node.previousSibiling;
      curr.node.remove();
      return previousSibiling;
    }
    for (let i = 0, len = curr?.children?.length || 0; i < len; i++) {
      if (curr?.children?.[i]) {
        let currSibiling = clearTree(curr?.children?.[i]);
        if (!previousSibiling) previousSibiling = currSibiling;
      }
    }
    return previousSibiling;
  };
  console.dir(element);
  const previousSibiling = clearTree(element);
  console.log(previousSibiling);
  if (element?.children) delete element.children;
  if (element?.node) delete element.node;
  //
  if (newValue instanceof Element) {
    element.type = Fragment;
    element.children = newValue.type === Fragment ? newValue.children : [newValue];
  } else {
    element.type = TextNode;
    element.node = document.createTextNode(newValue || "");
  }
  buildNodeTree(element.parent, newValue, previousSibiling);*/
}
