import { Fragment, TextNode, Element, Component } from "./element"
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
    const fragment = this.createDocumentFragment();
    this.append = (element) => fragment.appendChild(element.node);
    this.#content = this.#apply(this, content);
    const render = () => {
      this.node.replaceChildren(fragment);
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
        element = this.#apply(parent, element.call(), INTERNAL.COMPONENT.EFFECTS);
        INTERNAL.COMPONENT.CONTEXT = context;
        return element;
      }
      else return this.#apply(parent, convertToElement(element));
    }
    if (element.props instanceof State && !element.subscribed) {
      element.props.subscribe(() => this.#update(element));
      element.context = INTERNAL.COMPONENT.COPY_CONTEXT();
      element.subscribed = true;
    }
    //
    const { type, key, ref, props, children } = element;
    element.parent = parent;
    if (props.scope) addScope(this.#css, props.scope);
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = this.createTextNode(children);
      else if (type !== Fragment) element.node = this.createElement(type);
      else element.nodes = [];
      element.append = (child) => {
        try {
          if (type === Fragment) {
            element.parent.append(child);
            element.nodes.push(child.node);
          }
          else element.node.appendChild(child.node);
        }
        catch (e) {
          console.log(child);
          throw e;
        }
      }
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (typeof ref === "object") ref.current = element.node;
      }
      if (effects?.length > 0) {
        element.effects = effects;
        this.#effects.push(() => effects.forEach(({ add }) => add()));
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
      }
      if (type !== TextNode && children) {
        for (let i = 0, len = children?.length || 0; i < len; i++)
          element.children[i] = this.#apply(element, children[i]);
      }
      // INTERNAL[FORM_CONTEXT]?.register(element);
    } else element.node = this.#keys[key];
    if (type !== Fragment) parent.append(element);
    return element;
  }

  async #update(element) {
    INTERNAL.RENDER.ACTIVE = true;
    INTERNAL.COMPONENT.CONTEXT = element.context;
    console.log(element);
    /*this.#effects = [];
    const fragment = this.createDocumentFragment();
    const previous = element?.nodes || [];
    const parent = element.parent;
    findEffects(element, (effects) =>
      this.#effects.push(() => effects.forEach(({ remove }) => remove())),
    );
    element.children = [element.props?.valueOf()];
    parent.append = (child) => fragment.appendChild(child.node);
    this.#apply(parent, element);
    // FUTURE: Improvement would be to remove multiple Nodes with one node commit
    for (let i = 0, len = previous.length; i < len; i++) previous[i].remove();
    if (fragment.childNodes.length > 0) {
      //const parentNode = getParentNode(element);
      //const siblingNode = getSiblingNode(element, element.parent, parentNode);
      console.log(parent);
      //if (siblingNode) parentNode.insertBefore(fragment, siblingNode);
      //else parentNode.appendChild(fragment);
    }
    if (parent.node === this.node) this.#children = [...this.node.children];
    this.#updateStyles();
    this.#effects.forEach((effect) => effect());*/
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
  const element = new Element();
  element.type = Fragment;
  element.props = {};
  if (target instanceof State) element.props = target, element.children = [target?.valueOf()];
  else if (Array.isArray(target)) element.children = target;
  else if (target instanceof Promise) {
    if ("production" !== process.env.NODE_ENV) console.warn("Async Components need to be wrapped in async function");
    return false;
  }
  else if (!target?.toString || typeof target === "function") {
    if ("production" !== process.env.NODE_ENV) console.warn(`${typeof target} are not valid Elements`);
    return false;
  }
  else element.type = TextNode, element.children = "" + target;
  return element;
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

//

function getParentNode(element) {
  return element.parent?.node || getParentNode(element.parent);
}

function getSiblingNode(previous, parent, parentNode) {
  if (parent.node === parentNode) return null;
  let found = !previous;
  for (let i = 0, len = parent?.children?.length || 0; i < len; i++) {
    const curr = parent.children[i];
    if (!found) found = curr === previous;
    else {
      if (curr.node != null) return curr.node;
      const siblingNode = getSiblingNode(null, parent.parent, parentNode);
      if (siblingNode) return siblingNode;
    }
  }
  return previous === null ? null : getSiblingNode(parent, parent.parent, parentNode);
}
