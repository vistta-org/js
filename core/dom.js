import { system } from "@/utils";

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");

class Element {
  constructor({ type, key, ref, props, children }) {
    this.type = type;
    this.key = key;
    this.ref = ref;
    if(props) this.props = props;
    if(children) this.children = children;
  }
}

const createElement = (type, attributes, ...children) => {
  const { key, ref, ...props } = attributes || {};
  //
  if(typeof type === "string") return new Element({ key, ref, type, props, children });
  if(typeof type === "function") return new Element({ key, ref, ...(type({ ...props, children })) });
  if(type === Fragment) return new Element({ type, children });
  return null;
};

class VirtualDom {
  #context = {};
  #root = {};

  render(root, content, callback) {
    this.#root = new Element({ type: "app-root" })
    this.#root.node = (root.innerHTML = "", root);
    const build = (parent, element) => {
      if (typeof element === 'function') return build(parent, element());
      if (!(element instanceof Element)) element = convertElement(element);
      if (element == null || typeof element === 'boolean') return null;
      //
      element.parent = parent;
      this.#context.element = element;
      /*createNode(element);
      if(element.type !== Text) {
        Object.entries(element.props || {}).forEach(([name, value]) => {
          this.#context.attribute = (x) => {
            if(!element.node) return;
            if(/on[A-Z].*//*.test(name)) {
              if(typeof x !== "function") return;
              element.node.addEventListener(name.charAt(2).toLowerCase() + name.slice(3), x);
              return;
            }
            if(!value) element.node.removeAttribute(name);
            else if(value === true) element.node.setAttribute(name, "");
            else element.node.setAttribute(name, value);
          }
          this.#context.attribute(value);
          delete this.#context.attribute;
        });
      }*/
      if(element.children) element.children = element.children.map((child) => build(element, child));
      // append(parent, element);
      return element;
    }
    this.#root.children = [build(this.#root, content)];
    console.log("Rendered Dom:", this.#root);
    this.#context = {};
    callback && callback();
  }

  get context() {
    return this.#context;
  }
}

const dom = new VirtualDom();

const render = (...args) => dom.render(...args);

system.set("Fragment", Fragment);
system.set("createElement", createElement);

export { Fragment, createElement, dom, render };

//

function createNode(element) {
  if(element.type === Fragment) return;
  if(element.type === Text)
    element.node = document.createTextNode(element.value || "");
  else element.node = document.createElement(element.type);
  element.node.__vdom = element;
}

function append(parent, element) {
  if(!(element instanceof Element) || element.type === Fragment) return;
  const getNode = (instace) => {
    if(!instace) return null;
    if(instace?.type === Fragment) return getNode(instace.parent);
    return instace.node;
  }
  const node = getNode(parent);
  if(node && element.node) node.appendChild(element.node);
}

function convertElement(element) {
  if(typeof element === "object") {
    if(element.toString) return new Element({ type: Text, value: element });
    return null;
  }
  return new Element({ type: Text, value: element });
}