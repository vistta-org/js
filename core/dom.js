import { Fragment, TextNode, Element, convertToElement } from "./element"
import { State, INTERNAL, ADDED_EFFECT_EVENT, REMOVED_EFFECT_EVENT, FORM_CONTEXT, RENDER_CONTEXT } from "./hooks";
import { isEqual, isBrowser } from "../utils";
import { applyTransition } from "./transitions";

const BUILD = process.env.BUILD;

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
    this.#css = config?.styles?.reduce((res, { id, raw }) => ((res[id] = raw), res), {}) || {};
    this.#config = config;
  }

  render(content, refresh, callback) {
    INTERNAL[RENDER_CONTEXT] = true;
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    this.#content = this.#apply((child) => {
      if (child?.node) fragment.append(child.node);
      return this.body;
    }, content);
    const render = () => {
      this.body.replaceChildren(fragment);
      this.#updateStyles();
      this.#children = [...this.body.children];
      if (isBrowser()) this.#effects.forEach((effect) => effect());
      INTERNAL[RENDER_CONTEXT] = false;
      callback && callback(this.#config);
    };
    if (BUILD || refresh) render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  remove() {
    this.#effects = [];
    findEffects(this.#content, (effects) => effects.forEach((callback) => callback(REMOVED_EFFECT_EVENT)));
  }

  refresh(callback) {
    this.#effects = [];
    const render = () => {
      this.body.replaceChildren(...this.#children);
      this.#updateStyles();
      findEffects(this.#content, (effects) => effects.forEach((callback) => callback(ADDED_EFFECT_EVENT)));
      callback && callback(this.#config);
    }
    if (BUILD) return render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  #apply(append, element) {
    if (element == null || element === false) return append();
    if (!(element instanceof Element)) return this.#apply(append, convertToElement(element));
    if (element.props instanceof State && !element.subscribed) {
      element.props.subscribe(() => this.#update(element));
      element.subscribed = true;
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
        if (type === "button") props.type = props.type || "button";
        if (props) {
          const keys = Object.keys(props);
          for (let i = 0, len = keys?.length || 0; i < len; i++) {
            const name = keys[i];
            const value = props[name];
            if (value && value instanceof State) {
              value.subscribe(() => setAttribute(element.node, name, value.valueOf()));
              setAttribute(element.node, name, value.valueOf());
            }
            else setAttribute(element.node, name, value);
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
      INTERNAL[FORM_CONTEXT]?.register(element);
    } else element.node = this.#keys[key];
    if (type !== Fragment) element.parent = append(element);
    return element;
  }

  async #update(element) {
    INTERNAL[RENDER_CONTEXT] = true;
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
    INTERNAL[RENDER_CONTEXT] = false;
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
