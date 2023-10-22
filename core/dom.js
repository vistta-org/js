import { Fragment, TextNode, Element } from "./element"
import { State, ADDED_EFFECT_EVENT, REMOVED_EFFECT_EVENT } from "./hooks";
import { isEqual, isBrowser } from "../utils";

const BUILD = process.env.BUILD;
const ANIMATIONS = ["fade", "slide", "custom"];

//

export default class VirtualDom {
  #content;
  #config;
  #store;
  #keys = {};
  #children = [];
  #css = {};
  #effects = [];
  #appliedScopes = [];

  body = document.body;
  head = document.head;
  style;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

  constructor(node, config = {}) {
    if (node === false) return this;
    else if (node) this.body = node;
    this.style = this.head.querySelector("style#route");
    if (!this.style) {
      this.style = this.createElement("style");
      this.head.appendChild(this.style);
    }
    this.#css = config?.styles?.reduce((res, { id, raw }) => ((res[id] = raw), res), {});
    this.#config = config;
  }

  render(content, refresh, callback) {
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    this.#content = this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return this.body;
    }, content);
    animate(
      this.body,
      this.#config?.animation,
      () => {
        this.body.replaceChildren(fragment);
        this.#updateStyles();
        this.#children = [...this.body.children];
        if (isBrowser()) this.#effects.forEach((effect) => effect());
        callback && callback(this.#config);
      },
      refresh,
    );
  }

  remove() {
    this.#effects = [];
    findEffects(this.#content, (effects) => effects.forEach((callback) => callback(REMOVED_EFFECT_EVENT)));
  }

  refresh(callback) {
    this.#effects = [];
    animate(this.body, this.#config?.animation, () => {
      this.body.replaceChildren(...this.#children);
      this.#updateStyles();
      findEffects(this.#content, (effects) => effects.forEach((callback) => callback(ADDED_EFFECT_EVENT)));
      callback && callback(this.#config);
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
    if (type !== Fragment) element.parent = append(element);
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
    this.#updateStyles();
    this.#effects.forEach((effect) => effect());
  }

  #updateStyles() {
    const keys = Object.keys(this.#css);
    if (isEqual(this.#appliedScopes, keys)) return;
    if (this.style?.styleSheet) this.style.styleSheet.cssText = Object.values(this.#css).join(" ");
    else this.style?.replaceChildren(this.createTextNode(Object.values(this.#css).join(" ")));
    this.#appliedScopes = keys;
  }
}

//

let animationCount = -1;
function animate(body, animation, callback, refresh) {
  if (refresh || !ANIMATIONS.includes(animation) || BUILD) return callback();
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
  else if (name === "style") {
    const keys = Object.keys(value);
    for (let i = 0, len = keys.length || 0; i < len; i++) node.style.setProperty(keys[i], value[keys[i]]);
  } else node.setAttribute(name, value);
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
