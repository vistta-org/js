import { system } from "../utils";
import { State, INTERNAL, HOOK_CONTEXT, SCOPE_CONTEXT, ADDED_EFFECT_EVENT, REMOVED_EFFECT_EVENT } from "./hooks";

const ANIMATIONS = ["fade", "slide", "custom"];
const Fragment = Symbol("Fragment");
const TextNode = Symbol("TextNode");

class Element {
  constructor(type, props, children) {
    this.type = type;
    this.props = props || {};
    this.children = children;
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
  #effects = [];

  body = document.body;
  head = document.head;
  style;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

  constructor(node, styles = []) {
    if (node === false) return this;
    else if (node) this.body = node;
    this.style = this.head.querySelector("style#route");
    if (!this.style) {
      this.style = this.createElement("style");
      this.head.appendChild(this.style);
    }
    this.#css = styles?.reduce((res, { id, raw }) => ((res[id] = raw), res), {});
  }

  render(content, { animation, callback, refresh } = {}) {
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    this.#content = this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return this.body;
    }, content);
    animate(
      this.body,
      animation,
      () => {
        this.body.replaceChildren(fragment);
        if (this.style?.styleSheet) this.style.styleSheet.cssText = Object.values(this.#css).join(" ");
        else this.style?.replaceChildren(this.createTextNode(Object.values(this.#css).join(" ")));
        this.#children = [...this.body.children];
        this.#effects.forEach((effect) => effect());
        callback && callback();
      },
      refresh,
    );
  }

  remove() {
    this.#effects = [];
    findEffects(this.#content, (effects) => effects.forEach((callback) => callback(REMOVED_EFFECT_EVENT)));
  }

  refresh({ animation, callback } = {}) {
    this.#effects = [];
    animate(this.body, animation, () => {
      this.body.replaceChildren(...this.#children);
      if (this.style?.styleSheet) this.style.styleSheet.cssText = Object.values(this.#css).join(" ");
      else this.style?.replaceChildren(this.createTextNode(Object.values(this.#css).join(" ")));
      findEffects(this.#content, (effects) => effects.forEach((callback) => callback(ADDED_EFFECT_EVENT)));
      callback && callback();
    });
  }

  #apply(append, element) {
    if (element == null || element === false) return append();
    if (!(element instanceof Element)) {
      if (element instanceof State) {
        element = new Element(Fragment, element);
        element.children = [element.props?.valueOf()];
        element.props.subscribe(() => this.#update(element));
      } else if (Array.isArray(element)) element = new Element(Fragment, null, element);
      else if (!element?.toString || typeof element === "function") {
        if ("production" !== process.env.NODE_ENV) console.warn("Tried to render an invalid Element"), console.log(element);
        return append();
      } else element = new Element(TextNode, null, "" + element);
    }
    //
    const { type, key, ref, props, children, effects } = element;
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
      if (type !== Fragment) {
        if (props) {
          const keys = Object.keys(props);
          for (let i = 0, len = keys?.length || 0; i < len; i++) {
            const name = keys[i];
            const value = props[name];
            if (value && value instanceof State) value.subscribe(() => setAttribute(element.node, name, value));
            setAttribute(element.node, name, value);
          }
        }
        element.parent = append(element);
      } else if (effects) this.#effects.push(() => effects.forEach((callback) => callback(ADDED_EFFECT_EVENT)));
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
    return element;
  }

  async #update(element) {
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    const previous = element?.nodes || [];
    const parent = element.parent;
    findEffects(element, (effects) =>
      this.#effects.push(() => effects.forEach((callback) => callback(REMOVED_EFFECT_EVENT))),
    );
    element.children = [element.props?.valueOf()];
    this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return parent;
    }, element);
    // FUTURE: Improvement would be to remove multiple Nodes with one node commit
    element.nextSibling = previous?.[previous.length - 1]?.nextSibling || element.nextSibling;
    for (let i = 0, len = previous.length; i < len; i++) previous[i].remove();
    if (element.nextSibling) parent.insertBefore(fragment, element.nextSibling);
    else parent.appendChild(fragment);
    if (parent === this.body) this.#children = [...this.body.children];
    this.#effects.forEach((effect) => effect());
  }
}

//

let animationCount = -1;
function animate(body, animation, callback, refresh) {
  if (refresh || !ANIMATIONS.includes(animation)) return callback();
  animationCount++;
  const id = animationCount;
  const animationend = () => {
    if (id !== animationCount) return body.removeEventListener("animationend", animationend);
    if (body.classList.contains(animation + "-out")) {
      callback();
      body.classList.add(animation + "-in");
      body.classList.remove(animation + "-out");
    } else if (body.classList.contains(animation + "-in")) {
      body.classList.remove(animation + "-in");
      body.removeEventListener("animationend", animationend);
    }
  };
  body.addEventListener("animationend", animationend);
  body.classList.add(animation + "-out");
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

function findEffects(element, callback) {
  if (!element || !(element instanceof Element)) return null;
  if (element?.effects) callback(element?.effects);
  for (let i = 0, len = element?.children?.length || 0; i < len; i++) findEffects(element.children[i], callback);
}

function addScope(css, scope) {
  const keys = Object.keys(scope);
  for (let i = 0, len = keys.length; i < len; i++) {
    if (!css[keys[i]]) css[keys[i]] = scope[keys[i]];
  }
}
