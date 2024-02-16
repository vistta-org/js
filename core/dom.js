import { INTERNAL, Ref, State } from "./tools";
import { Component, Suspense } from "./components";
import { Fragment, TextNode, Element, createElement } from "./element";
import { applyTransition } from "./transitions";
import { isBrowser, setImmediate } from "../utils";

const BUILD = process.env.BUILD;

export default class VirtualDom {
  #content;
  #config;
  #store;
  #keys = {};
  #children = [];
  #effects = [];
  #pathname;

  node = document.body;
  body = document.body;
  head = document.head;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);
  createStyle(scope) {
    const exist = this.head.querySelector(`link[id="${scope}"]`);
    if (exist) return;
    const link = document.createElement("link");
    link.id = scope;
    link.rel = "stylesheet";
    link.href = `./resources/${scope}.css`;
    this.head.appendChild(link);
  }

  get pathname() {
    return this.#pathname;
  }

  constructor(pathname, node, config = {}) {
    this.#pathname = pathname;
    if (node === false) return this;
    else if (node) this.node = node;
    this.#config = config;
  }

  render(content, refresh, callback) {
    this.#effects = [];
    const fragment = this.createDocumentFragment();
    this.appendChild = (element) => fragment.appendChild(element.node);
    this.#content = this.#apply(this, content, { context: {} });
    const render = () => {
      this.node.replaceChildren(fragment);
      this.#children = [...this.node.children];
      if (!process.env.IS_NODE) {
        for (let i = 0, len = this.#effects.length; i < len; i++) {
          const effectsLen = this.#effects[i].length;
          for (let e = 0; e < effectsLen; e++) {
            this.#effects[i][e].add();
          }
        }
      }
      callback && callback(this.#config);
    };
    if (BUILD || refresh) render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  remove() {
    for (let i = 0, len = this.#effects.length; i < len; i++) {
      const effectsLen = this.#effects[i].length;
      for (let e = 0; e < effectsLen; e++) {
        this.#effects[i][e].remove();
      }
    }
  }

  refresh(callback) {
    const render = () => {
      this.node.replaceChildren(...this.#children);
      for (let i = 0, len = this.#effects.length; i < len; i++) {
        const effectsLen = this.#effects[i].length;
        for (let e = 0; e < effectsLen; e++) {
          this.#effects[i][e].add();
        }
      }
      callback && callback(this.#config);
    }
    if (BUILD) return render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  #apply(parent, element, { effects, ...context }) {
    if (element == null || element === false) return null;
    if (!(element instanceof Element)) {
      if (Array.isArray(element)) element = createElement(Fragment, {}, ...element);
      else if (element instanceof Component) {
        if (element instanceof Suspense) {
          const suspense = element;
          element = createElement(Fragment, {}, suspense.fallback);
          context.suspense = suspense;
          setImmediate(() => this.#update(element, suspense(), context, (render) => suspense.resolve(render)));
          return this.#apply(parent, element, context);
        }
        INTERNAL.CONTEXT = (context.effects = [], context);
        return this.#apply(parent, element(), context);
      }
      else if (element instanceof State) {
        const state = element;
        element = createElement(Fragment, {}, convertStateValueToChildren(state.valueOf()));
        if (context.profiler) state.subscribe(context.profiler.record((callback) =>
          this.#update(element, convertStateValueToChildren(state.valueOf()), context, callback)
        ));
        else state.subscribe(() => this.#update(element, convertStateValueToChildren(state.valueOf()), context));
        return this.#apply(parent, element, context);
      }
      else if (element instanceof Promise) {
        context.suspense?.wait();
        const promise = element;
        element = createElement(Fragment, {}, createElement(TextNode, {}, ""));
        promise.then((children) => (this.#update(element, [children], context), context.suspense?.resolve()));
        return this.#apply(parent, element, context);
      }
      else if (!element?.toString || typeof element === "function" || element instanceof Promise) {
        if ("production" !== process.env.NODE_ENV) console.warn(`${typeof target} are not valid Elements`);
        return null;
      }
      else element = createElement(TextNode, {}, "" + element);
    }
    //
    const { type, key, ref, props, children } = element;
    element.parent = parent;
    if (props.scope) this.createStyle(props.scope);
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = this.createTextNode(children);
      else if (type !== Fragment) {
        element.node = this.createElement(type);
        element.appendChild = (child) => element.node.appendChild(child.node);
      }
      else {
        element.nodes = [];
        element.appendChild = (child) => (element.parent.appendChild(child), element.nodes.push(child.node));
      }
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (ref instanceof Ref) ref.current = element.node;
      }
      if (effects?.length > 0) element.effects = this.#effects.push(effects) - 1;
      if (type !== Fragment) {
        if (type === "button") props.type = props.type || "button";
        if (props) {
          const keys = Object.keys(props);
          for (let i = 0, len = keys?.length || 0; i < len; i++) {
            const name = keys[i];
            const value = props[name];
            if (value && value instanceof State) {
              if (context.profiler) value.subscribe(context.profiler.record((callback) => (
                setAttribute(element.node, name, value.valueOf()), callback()
              )));
              else value.subscribe(() => setAttribute(element.node, name, value.valueOf()));
              setAttribute(element.node, name, value.valueOf());
            }
            else setAttribute(element.node, name, value);
          }
        }
      }
      if (type !== TextNode && children) {
        for (let i = 0, len = children?.length || 0; i < len; i++)
          element.children[i] = this.#apply(element, children[i], context);
      }
      context.form?.register(element);
    } else element.node = this.#keys[key];
    if (type !== Fragment) parent.appendChild(element);
    return element;
  }

  #update(element, children, context, callback) {
    if (!isBrowser()) return;
    const fragment = this.createDocumentFragment();
    const previous = element.nodes;
    const previousEffects = findEffects(element);
    const initialEffectsLength = this.#effects.length;
    const parent = element.parent;
    element.children = children;
    parent.appendChild = (child) => fragment.appendChild(child.node);
    element.nodes = [];
    this.#apply(parent, element, context);
    const parentNode = previous[0].parentNode;
    const elements = [];
    let replaced = -1;
    for (let i = 0, len = parentNode.childNodes.length; i < len; i++) {
      const cur = parentNode.childNodes[i];
      if (!previous.includes(cur)) elements.push(cur);
      else if (replaced == -1) replaced = elements.push(fragment);
    }
    const render = () => {
      parentNode.replaceChildren(...elements);
      if (parentNode === this.node) this.#children = [...this.node.children];
      const allEffectsLength = this.#effects.length;
      for (let i = 0, len = previousEffects.length; i < len; i++) {
        const previous = this.#effects.splice(previousEffects[i], 1)[0];
        for (let e = 0, eLen = previous.length; e < eLen; e++) {
          previous[e].remove();
        }
      }
      for (let i = previousEffects.length > 0 ? allEffectsLength - previousEffects.length : initialEffectsLength, len = this.#effects.length; i < len; i++) {
        const effectsLen = this.#effects[i].length;
        for (let e = 0; e < effectsLen; e++) {
          this.#effects[i][e].add();
        }
      }
    }
    if (!callback) render();
    else callback(render);
  }
}

//

function setAttribute(node, name, value) {
  if (/^on\w.*/.test(name) && typeof value === "function") {
    node.addEventListener(name.slice(2).toLowerCase(), (event, ...args) => {
      try {
        event.stritMode = () => {
          if (event.target !== node) throw "Event strict mode active";
        }
        value(event, ...args);
      }
      catch { /* Do Nothing */ }
    });
    return;
  }
  if (name === "className") name = "class";
  if (!value) node.removeAttribute(name);
  else if (name === "style") {
    const keys = Object.keys(value);
    for (let i = 0, len = keys.length || 0; i < len; i++) node.style.setProperty(keys[i], value[keys[i]]);
  } else node.setAttribute(name, value);
}

function findEffects(element, effects = []) {
  if (!element || !(element instanceof Element)) return effects;
  if (element?.effects) effects.push(element.effects);
  for (let i = 0, len = element?.children?.length || 0; i < len; i++) findEffects(element.children[i], effects);
  return effects;
}

function convertStateValueToChildren(value) {
  if (Array.isArray(value)) return value.length == 0 ? [createElement(TextNode, {}, "")] : value;
  return value == null || value === false ? [createElement(TextNode, {}, "")] : [value];
}