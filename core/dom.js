import { system } from "@/utils";
import { State } from "./state";

export default class VirtualDom {
  #node;
  #content;

  constructor(node) {
    this.#node = node || document.body;
  }

  render(content, callback) {
    const fragment = document.createDocumentFragment();
    this.#content = apply(fragment, content);
    this.#node.replaceChildren(fragment);
    clearFragment(this.#content, fragment, this.#node);
    console.log(this.#content);
    callback && callback();
  }
}

//

const Fragment = Symbol("Fragment");
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
  if (typeof type === "function") {
    const { key, ref } = props || {};
    if (key) delete props.key;
    if (ref) delete props.ref;
    if (children?.length > 0) props.children = children;
    const element = type(props);
    if (Array.isArray(element)) return new Element({ key, ref, type: Fragment, children: element });
    if (element && element instanceof State) return element;
    ({ type, props, children } = element);
    return new Element({ key, ref, type, props, children });
  }
  const { key, ref } = props || {};
  if (key) delete props.key;
  if (ref) delete props.ref;
  return new Element({ key, ref, type, props, children });
};

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, createElement };

//

function apply(parent, element) {
  if (!element == null) return null;
  if (typeof element === "function") return apply(parent, element());
  if (!(element instanceof Element)) {
    if (element instanceof State) {
      element = new Element({ type: Fragment, value: element });
      element.children = convertToArray(element);
      element.value.subscribe(() => update(element));
    } else if (Array.isArray(element)) element = new Element({ type: Fragment, children: element });
    else element = new Element({ type: TextNode, value: `${element != null ? element : ""}` });
  }
  //
  const { type, props, children, value } = element;
  let node;
  if (type === TextNode) node = document.createTextNode(value);
  else if (type !== Fragment) node = document.createElement(type);
  element.parent = parent;
  if (props) {
    const keys = Object.keys(props);
    for (let i = 0, len = keys?.length || 0; i < len; i++) {
      const name = keys[i],
        value = props[name];
      if (value && value instanceof State) value.subscribe(() => setAttribute(node, name, value));
      setAttribute(node, name, value);
    }
  }
  if (children) {
    for (let i = 0, len = children?.length || 0; i < len; i++) element.children[i] = apply(node || parent, children[i]);
  }
  if (node) parent.appendChild(((element.node = node), node));
  return element;
}

function update(element) {
  const fragment = document.createDocumentFragment();
  const previous = element?.children || [];
  const parent = element.parent;
  element.children = convertToArray(element);
  apply(fragment, element);
  // FUTURE: Improvement would be to remove multiple Nodes with one node commit
  const nextSibling = remove({ children: previous });
  element.parent = parent;
  if (nextSibling) parent.insertBefore(fragment, nextSibling);
  else parent.appendChild(fragment);
}

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
  if (!value) node.removeAttribute(name);
  if (name.includes("-")) node.setAttribute(name, value);
  else node[name] = value;
}

function remove({ node, children }) {
  if (node) {
    const nextSibling = node.nextSibling;
    node.remove();
    return nextSibling;
  }
  let nextSibling;
  if (children) for (let i = 0, len = children?.length || 0; i < len; i++) nextSibling = remove(children[i]);
  return nextSibling;
}

function clearFragment(element, fragment, parent) {
  if (element.parent !== fragment) return;
  element.parent = parent;
  for (let i = 0, len = element?.children?.length || 0; i < len; i++) {
    clearFragment(element.children[i], fragment, parent);
  }
}
