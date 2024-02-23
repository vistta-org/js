import { INTERNAL, Ref, State } from "./tools";
import { Component, Suspense } from "./components";
import { Fragment, TextNode, Element, createElement } from "./element";
import { applyTransition } from "./transitions";
import { isBrowser, capitalize, updateReferences } from "../utils";

const BUILD = process.env.BUILD;
const STRICT_MODE = new Error("Event strict mode active");

export default class VirtualDom {
  #content;
  #config;
  #store;
  #keys = {};
  #children = [];
  #effects = [];
  #pathname;
  #queue = [];

  node = document.body;
  body = document.body;
  head = document.head;
  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

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
    this.#content = this.#apply(this, content, { effects: [] });
    const render = () => {
      this.node.replaceChildren(fragment);
      this.#children = [...this.node.children];
      if (!process.env.IS_NODE) {
        for (let i = 0, len = this.#effects.length; i < len; i++)
          subscribe(this.#effects[i]);
      }
      callback && callback(this.#config);
      this.#queue.shift()?.();
    };
    if (BUILD || refresh) render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  remove() {
    for (let i = 0, len = this.#effects.length; i < len; i++)
      unsubscribe(this.#effects[i]);
  }

  refresh(callback) {
    const render = () => {
      this.node.replaceChildren(...this.#children);
      for (let i = 0, len = this.#effects.length; i < len; i++)
        subscribe(this.#effects[i]);
      callback && callback(this.#config);
    }
    if (BUILD) return render();
    else applyTransition.call(this, this.#config?.transition, render);
  }

  #apply(parent, element, { ...context }, effects) {
    if (element == null || element === false) element = createElement(TextNode, {}, "");
    else if (!(element instanceof Element)) {
      if (Array.isArray(element)) element = createElement(Fragment, {}, ...element);
      else if (element instanceof Component) {
        if (element instanceof Suspense) {
          const suspense = element;
          element = createElement(Fragment, {}, suspense.fallback);
          this.#queue.push(() => {
            const fragment = this.createDocumentFragment();
            parent.appendChild = (child) => fragment.appendChild(child.node);
            INTERNAL.SUSPENSE = suspense;
            const value = suspense();
            let prev = element;
            if (Array.isArray(value)) element = this.#apply(parent, createElement(Fragment, {}, ...(value.length == 0 ? [createElement(TextNode, {}, "")] : value)), context);
            else element = this.#apply(parent, createElement(Fragment, {}, value == null || value === false ? createElement(TextNode, {}, "") : value), context);
            suspense.resolve(() => this.#queue?.length > 0 ?
              this.#queue.push(() => this.#replace(prev, element, fragment)) :
              this.#replace(prev, element, fragment)
            );
            this.#queue.shift()?.();
          });
          return this.#apply(parent, element, context);
        }
        const _effects = [];
        INTERNAL.CONTEXT = context;
        INTERNAL.EFFECTS = _effects;
        return this.#apply(parent, element(), context, _effects);
      }
      else if (element instanceof State) {
        const state = element;
        const stateContext = context;
        [element, context] = convertState(state, stateContext);
        if (stateContext.profiler) state.subscribe((UPDATE_COUNT) => {
          const recorder = stateContext.profiler.record((callback) => this.#update(element, ...convertState(state, stateContext), callback));
          if (this.#queue?.length > 0) this.#queue.push(() => recorder(UPDATE_COUNT));
          else recorder(UPDATE_COUNT);
        });
        else state.subscribe(() => {
          if (this.#queue?.length > 0) this.#queue.push(() => this.#update(element, ...convertState(state, stateContext)));
          else this.#update(element, ...convertState(state, stateContext));
        });
        return this.#apply(parent, element, context);
      }
      else if (!element?.toString || typeof element === "function" || element instanceof Promise)
        throw new Error(`${capitalize(typeof element)} is not a valid Element`);
      else element = createElement(TextNode, {}, "" + element);
    }
    //
    const { type, key, ref, props, children } = element;
    element.parent = parent;
    element.effects = effects;
    if (!this.#keys?.[key]) {
      if (type === TextNode) element.node = this.createTextNode(children);
      else if (type === Fragment) element.appendChild = (child) => (element.parent.appendChild(child));
      else {
        element.node = this.createElement(type);
        element.appendChild = (child) => element.node.appendChild(child.node);
      }
      if (key) this.#keys[key] = element.node;
      if (ref) {
        if (typeof ref === "function") ref(element.node);
        else if (ref instanceof Ref) ref.current = element.node;
      }
      if (element.effects?.length > 0) this.#effects.push(effects);
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

  #update(prev, element, context, callback) {
    if (!isBrowser()) return;
    const fragment = this.createDocumentFragment();
    prev.parent.appendChild = (child) => fragment.appendChild(child.node);
    this.#apply(prev.parent, element, context);
    this.#replace(prev, element, fragment, callback);
  }

  #replace(prev, element, node, callback) {
    const prevNodes = findNodes(prev);
    const parentNode = prevNodes[0].parentNode;
    const elements = [];
    let replaced = -1;
    for (let i = 0, len = parentNode.childNodes.length; i < len; i++) {
      const cur = parentNode.childNodes[i];
      if (!prevNodes.includes(cur)) elements.push(cur);
      else if (replaced == -1) replaced = elements.push(node);
    }
    parentNode.replaceChildren(...elements);
    if (parentNode === this.node) this.#children = [...this.node.children];
    executeOnElementEffects(prev, (effects) => {
      for (let i = 0, len = this.#effects.length; i < len; i++) {
        if (this.#effects[i] === effects) this.#effects.splice(i, 1);
      }
      unsubscribe(effects);
    })
    executeOnElementEffects(element, (effects) => subscribe(effects));
    updateReferences(prev, element);
    this.#queue.shift()?.();
    if (callback) callback();
  }
}

//

function setAttribute(node, name, value) {
  if (/^on\w.*/.test(name) && typeof value === "function") {
    node.addEventListener(name.slice(2).toLowerCase(), (event, ...args) => {
      try {
        event.stritMode = () => {
          if (event.target !== node) throw STRICT_MODE;
        }
        value(event, ...args);
      }
      catch (e) {
        if (e !== STRICT_MODE) throw e;
      }
    });
    return;
  }
  if (name === "className") name = "class";
  if (!value) node.removeAttribute(name);
  else if (name === "style" && typeof value === "object") {
    const keys = Object.keys(value);
    for (let i = 0, len = keys.length || 0; i < len; i++) node.style.setProperty(keys[i], value[keys[i]]);
  } else node.setAttribute(name, typeof value === "boolean" ? "" : value);
}

function convertState(state, { ...context }) {
  INTERNAL.CONTEXT = context;
  const value = state();
  if (Array.isArray(value)) return [createElement(Fragment, {}, ...(value.length == 0 ? [createElement(TextNode, {}, "")] : value)), context];
  return [createElement(Fragment, {}, value == null || value === false ? createElement(TextNode, {}, "") : value), context];
}

function subscribe(effects) {
  for (let i = 0, len = effects.length; i < len; i++) effects[i].subscribe();
}

function unsubscribe(effects) {
  for (let i = 0, len = effects.length; i < len; i++) effects[i].unsubscribe();
}

function findNodes(element, nodes = []) {
  if (!element || !(element instanceof Element)) return nodes;
  if (element.node) nodes.push(element.node);
  else {
    for (let i = 0, len = element?.children?.length || 0; i < len; i++) findNodes(element.children[i], nodes);
  }
  return nodes;
}

function executeOnElementEffects(element, callback) {
  if (!element || !(element instanceof Element)) return;
  if (element?.effects?.length > 0) callback(element.effects);
  for (let i = 0, len = element?.children?.length || 0; i < len; i++) executeOnElementEffects(element.children[i], callback);
}