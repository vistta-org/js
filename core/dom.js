import { Fragment, TextNode, Element, Component, createElement } from "./element"
import { State } from "./hooks";
import { isEqual, isBrowser } from "../utils";
import { INTERNAL } from "./context";
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

  node = document.body;
  body = document.body;
  head = document.head;
  style;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

  constructor(node, config = {}) {
    if (node === false) return this;
    else if (node) this.node = node;
    this.style = this.head.querySelector("style#route");
    if (!this.style) {
      this.style = this.createElement("style");
      this.head.appendChild(this.style);
    }
    this.#css = config?.styles?.reduce((res, { id, raw }) => ((res[id] = raw), res), {}) || {};
    this.#config = config;
  }

  render(content, refresh, callback) {
    INTERNAL.RENDER.ACTIVE = true;
    this.#effects = [];
    const node = this.node;
    this.node = this.createDocumentFragment();
    this.#content = this.#apply(this, content);
    const render = () => {
      node.replaceChildren(this.node);
      this.node = node;
      this.#updateStyles();
      this.#children = [...this.node.children];
      if (isBrowser()) this.#effects.forEach((effect) => effect());
      INTERNAL.RENDER.ACTIVE = false;
      callback && callback(this.#config);
    };
    if (BUILD || refresh) render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  remove() {
    this.#effects = [];
    findEffects(this.#content, (effects) => effects.forEach(({ remove }) => remove()));
  }

  refresh(callback) {
    this.#effects = [];
    const render = () => {
      this.node.replaceChildren(...this.#children);
      this.#updateStyles();
      findEffects(this.#content, (effects) => effects.forEach(({ add }) => add()));
      callback && callback(this.#config);
    }
    if (BUILD) return render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  #apply(parent, element, effects) {
    if (element == null || element === false) return null;
    if (!(element instanceof Element)) {
      if (element instanceof Component) {
        const context = INTERNAL.COMPONENT.COPY_CONTEXT(true);
        const result = this.#apply(parent, element.call(), INTERNAL.COMPONENT.EFFECTS);
        INTERNAL.COMPONENT.CONTEXT = context;
        return result;
      }
      else return this.#apply(parent, convertToElement(element));
    }
    //
    const { type, key, ref, props, children } = element;
    element.parent = getValidParent(parent);
    if (type === State.type && !element.subscribed) {
      props.subscribe(() => this.#update(element));
      element.subscribed = true;
      element.context = INTERNAL.COMPONENT.COPY_CONTEXT();
      element.node = element.parent.node;
    }
    if (props.scope) addScope(this.#css, props.scope);
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = this.createTextNode(children);
      else if (type !== Fragment && type !== State.type) element.node = this.createElement(type);
      //
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (typeof ref === "object") ref.current = element.node;
      }
      if (effects?.length > 0) {
        element.effects = effects;
        this.#effects.push(() => effects.forEach(({ add }) => add()));
      }
      if (type !== Fragment && type !== State.type) {
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
      }
      if (type !== TextNode && children) {
        for (let i = 0, len = children?.length || 0; i < len; i++) {
          const curr = this.#apply(element, children[i]);
          if (Array.isArray(curr)) element.children.splice(i, 1, ...curr);
          else element.children[i] = curr;
        }

      }
      // INTERNAL[FORM_CONTEXT]?.register(element);
    } else element.node = this.#keys[key];
    if (type === Fragment) return element.children;
    if (type !== State.type) element.parent.node.appendChild(element.node);
    return element;
  }

  async #update(element) {
    INTERNAL.RENDER.ACTIVE = true;
    INTERNAL.COMPONENT.CONTEXT = element.context;
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    const parent = element.parent;
    const previous = element.children;
    element.node = fragment;
    findEffects(element, (effects) =>
      this.#effects.push(() => effects.forEach(({ remove }) => remove())),
    );
    element.children = [element.props?.valueOf()];
    this.#apply({ node: fragment }, element);
    // FUTURE: Improvement would be to remove multiple Nodes with one node commit
    removeChildNodes(previous)
    if (fragment.childNodes.length > 0) {
      const sibling = getSibling(parent, element);
      if (sibling) parent.node.insertBefore(fragment, sibling.node);
      else parent.node.appendChild(fragment);
    }
    element.parent = parent;
    if (this === parent) this.#children = [...this.node.children];
    this.#updateStyles();
    this.#effects.forEach((effect) => effect());
    INTERNAL.RENDER.ACTIVE = false;
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

function convertToElement(target) {
  const element = createElement(Fragment, {}, []);
  if (target instanceof State) return createElement(target.constructor.type, target, [target?.valueOf()]);
  else if (Array.isArray(target)) element.children = target;
  else if (target instanceof Promise) {
    if ("production" !== process.env.NODE_ENV) console.warn("Async Components need to be wrapped in async function");
    return false;
  }
  else if (!target?.toString || typeof target === "function") {
    if ("production" !== process.env.NODE_ENV) console.warn(`${typeof target} are not valid Elements`);
    return false;
  }
  else return createElement(TextNode, {}, "" + target);
  return element;
}

function getValidParent(element) {
  return element?.type === Fragment ? getValidParent(element?.parent) : element;
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

function removeChildNodes(children) {
  for (let i = 0, len = children.length; i < len; i++) {
    const curr = children[i];
    if (!curr) continue;
    if (curr.type === State.type) removeChildNodes(curr.children);
    curr.node.remove();
  }
}

function getSibling(parent, element) {
  let found = !element;
  for (let i = 0, len = parent.children.length; i < len; i++) {
    const curr = parent.children[i];
    if (!curr) continue;
    if (!found) found = parent.children[i] === element;
    else {
      if (curr.type !== State.type) return curr;
      const sibling = getSibling(curr);
      if (sibling) return sibling;
    }
  }
  return element && parent.type === State.type ? getSibling(parent.parent, parent) : null;
}