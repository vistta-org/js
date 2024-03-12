/*
Benchmarks:
Initial
#1: 2.2999999998137355ms
#2: 2.6000000005587935ms
#3: 4.2000000001862645ms
#4: 29.200000000186265ms
Update:
#1: 0.811000000089407ms
#2: 0.9849999999776483ms
#3: 11.312000000014901ms (Without keys)
#3: 22.21900000009686ms (With keys)
#4: 11.344199999928474ms
*/

import { Context, Ref, Component, Suspense, Form } from "./classes";
import { Fragment, TextNode, Element, createElement } from "./element";
import { applyTransition } from "./transitions";
import { isBrowser, capitalize } from "../utils";

const BUILD = process.env.BUILD;
const STRICT_MODE = new Error("Event strict mode active");

export default class VirtualDom {
  node = document.body;
  queue = [];

  querySelector = (query) => document.querySelector(query);
  createDocumentFragment = () => document.createDocumentFragment();
  createTextNode = (text) => document.createTextNode(text);
  createElement = (tag) => document.createElement(tag);

  constructor(pathname, node, config = {}) {
    this.pathname = pathname;
    if (node) this.node = node;
    this.config = config;
    this.keys = {};
    this.children = [];
  }

  render(content, refresh, callback) {
    this.node.innerHTML = "";
    this.content = render.call(this, this, content, {});
    const resolve = () => {
      this.children = [...this.node.children];
      callback?.(this.config);
      this.queue.shift()?.();
    };
    if (BUILD || refresh) resolve();
    else applyTransition.call(this, this.config?.transition, resolve);
  }

  remove() {
    findComponents(this.content, (component) => component.onDisconnect?.());
  }

  refresh(callback) {
    const resolve = () => {
      this.node.replaceChildren(...this.children);
      findComponents(this.content, (component) => component.onConnect?.());
      callback?.(this.config);
    }
    if (BUILD) return resolve();
    else applyTransition.call(this, this.config?.transition, resolve);
  }

  appendNode(node, referenceNode) {
    if (referenceNode) this.node.insertBefore(node, referenceNode);
    else this.node.appendChild(node);
  }

  removeNode(node) {
    if (this.node !== node.parentNode) return;
    this.node.removeChild(node);
  }
}

// VDOM Manipulators

function render(parent, element, context, referenceNode) {
  if (element == null || element === false) return null;
  if (!(element instanceof Element)) {
    if (Array.isArray(element)) element = new Element(Fragment, {}, element);
    else if (element instanceof Context) {
      if (!context["#" + element.key]) {
        context["#" + element.key] = element;
        element.register(() => {
          if (context.component.update) context.component.update();
          else if (this.queue?.length > 0) this.queue.push(() => update.call(this, context.component, null, null, false, true));
          else update.call(this, context.component, null, null, false, true);
        });
      }
      element = createElement(TextNode, {}, element.toString());
    }
    else if (typeof element === "object" || typeof element === "function" || element instanceof Promise)
      throw new Error(`${capitalize(typeof element)} is not a valid Element`);
    else element = createElement(TextNode, {}, "" + element);
  }
  const { type, key, ref, props, children } = element;
  element.parent = parent;
  element.context = context;

  if (type === TextNode) {
    element.node = this.createTextNode(children);
    return (parent.appendNode(element.node, referenceNode), element);
  }

  if (typeof type === "string") {
    if (key?.length > 0) {
      if (this.keys[key] != null) {
        if (this.keys[key].type !== type) throw new Error(`Key ${key} already in use.`);
        this.keys[key].parent = parent;
        update.call(this, this.keys[key], element.props, element.children);
        return (parent.appendNode(this.keys[key].node, referenceNode), this.keys[key]);
      }
      else this.keys[key] = element;
    }
    element.node = this.createElement(type);
    if (props) {
      const keys = Object.keys(props);
      for (let i = 0, len = keys?.length || 0; i < len; i++)
        setAttribute(element.node, keys[i], props[keys[i]]);
    }
    if (typeof ref === "function") ref(element.node);
    else if (ref instanceof Ref) ref.node = element.node;
    for (let i = 0, len = children?.length || 0; i < len; i++)
      element.children[i] = render.call(this, element, children[i], { ...context });
    context.form?.register(element);
    return (parent.appendNode(element.node, referenceNode), element);
  }

  if (type === Component.Node) {
    if (key?.length > 0) {
      if (this.keys[key] != null) {
        if (this.keys[key].type !== type || element.ref !== this.keys[key].ref.constructor) throw new Error(`Key ${key} already in use.`);
        this.keys[key].parent = parent;
        const { firstNode, lastNode } = this.keys[key];
        mutate(element, "appendNode", firstNode, lastNode, referenceNode);
        update.call(this, this.keys[key], element.props);
        return this.keys[key];
      }
      else this.keys[key] = element;
    }
    context.component = element;
    const component = element.ref;
    if (component.constructor === Suspense) {
      if (props.fallback) {
        element.children = [props.fallback];
        if (isBrowser()) {
          context.suspense = component;
          const fragment = new Element("", {}, props.children);
          fragment.node = this.createDocumentFragment();
          for (let i = 0, len = element.children?.length || 0; i < len; i++)
            fragment.children[i] = render.call(this, fragment, fragment.children[i], { ...context });
          component.resolve(() => {
            if (element.parent.children.indexOf(element) == -1) return;
            const referenceNode = element.lastNode?.nextSibling;
            mutate(element, "removeNode", element.firstNode, element.lastNode);
            mutate(element, "appendNode", fragment.node.firstChild, fragment.node.lastChild, referenceNode);
            element.children = fragment.children;
          });
        }
      }
      else element.children = props.children;
    }
    else {
      if (component.constructor === Form) {
        if (context.form) component.register(context.form);
        else context.form = component;
      }
      const properties = Object.getOwnPropertyNames(component);
      if (!element.ignoreProperties) element.ignoreProperties = [];
      for (let i = 0, len = properties.length; i < len; i++) {
        const property = properties[i];
        if (component[property] instanceof Promise) {
          element.ignoreProperties.push(property);
          let value = null;
          if (isBrowser()) {
            context.suspense?.wait();
            component[property].then((result) => {
              value = result;
              if (element.update) element.update();
              else if (this.queue?.length > 0) this.queue.push(() => {
                update.call(this, element, null, null, false, true);
                context.suspense?.resolve();
              });
              else {
                update.call(this, element, null, null, false, true);
                context.suspense?.resolve();
              }
            }).catch(() => context.suspense?.resolve());
          }
          Object.defineProperty(component, property, {
            configurable: false,
            enumerable: true,
            get: () => value,
          });
        }
        else if (component[property] instanceof Context) {
          element.ignoreProperties.push(property);
          const _context = component[property];
          if (!context["#" + _context.key]) {
            context["#" + _context.key] = _context;
            _context.register(() => {
              if (element.update) element.update();
              else if (this.queue?.length > 0) this.queue.push(() => update.call(this, element, null, null, false, true));
              else update.call(this, element, null, null, false, true);
            });
          }
          Object.defineProperty(component, property, {
            configurable: false,
            enumerable: false,
            get: () => _context.valueOf(),
            set: (value) => {
              _context.setValue(value);
            },
          });
        }
        else if (component[property] instanceof Ref || typeof component[property] === "function")
          element.ignoreProperties.push(property);
        else {
          let value = props[property] ?? component[property];
          Object.defineProperty(component, property, {
            configurable: false,
            enumerable: true,
            get: () => value,
            set: (v) => {
              if (v === value) return;
              value = v;
              if (element.update) element.update();
              else if (this.queue?.length > 0) this.queue.push(() => update.call(this, element, null, null, false, true));
              else update.call(this, element, null, null, false, true);
            }
          });
        }
      }
      element.children = component.render();
      if (!Array.isArray(element.children)) element.children = [element.children];
    }
  }
  for (let i = 0, len = element.children?.length || 0; i < len; i++)
    element.children[i] = render.call(this, element, element.children[i], { ...context }, referenceNode);
  if (type === Component.Node) isBrowser() && element.ref.onConnect?.();
  return element;
}

function update(element, props, children, reset, dequeue) {
  if (!isBrowser()) return;
  if (element.type === TextNode) {
    element.node.nodeValue = children[0];
    if (dequeue) this.queue.shift()?.();
    return;
  }

  if (element.type === Component.Node) {
    const component = element.ref;
    let updated = false;
    if (props) {
      element.update = () => updated = true;
      const properties = Object.getOwnPropertyNames(component);
      for (let i = 0, len = properties.length; i < len; i++) {
        const property = properties[i];
        if (element.ignoreProperties.includes(property)) continue;
        component[property] = props[property];
      }
      element.update = null;
    }
    else updated = true;
    if (updated) {
      children = component.render();
      if (!Array.isArray(children)) children = [children];
    }
  }
  else if (element.type !== Fragment) {
    const oldKeys = Object.keys(element.props);
    const newKeys = Object.keys(props);
    for (let i = 0, len = oldKeys?.length || 0; i < len; i++) {
      const name = oldKeys[i];
      const index = newKeys.indexOf(name);
      if (index != -1) newKeys.splice(index, 1);
      if (element.props[name] !== props[name]) {
        element.props[name] = props[name];
        setAttribute(element.node, name, props[name]);
      }
    }
    for (let i = 0, len = newKeys?.length || 0; i < len; i++) {
      const name = newKeys[i];
      if (element.props[name] !== props[name]) {
        element.props[name] = props[name];
        setAttribute(element.node, name, props[name]);
      }
    }
    if (reset && (element.type === "input" || element.type === "html")) element.node.value = "";
  }

  if (children) {
    const previousChildren = [...element.children];
    const changes = [];
    element.children = [];

    for (let i = 0, len = children.length; i < len; i++)
      [element.children[i], changes[i]] = diff.call(this, children[i], i, previousChildren, reset || duplicatedId(children, i), true);
    for (let i = 0, len = children.length; i < len; i++) {
      if (changes[i]) continue;
      [element.children[i], changes[i]] = diff.call(this, children[i], i, previousChildren, reset || duplicatedId(children, i));
    }

    for (let i = 0, len = previousChildren.length; i < len; i++) {
      if (!previousChildren[i]) continue;
      const { node, firstNode, lastNode } = previousChildren[i];
      mutate(element, "removeNode", node || firstNode, lastNode);
      findComponents(previousChildren[i], (component) => component.onDisconnect?.());
    }

    for (let i = 0, len = element.children.length; i < len; i++) {
      if (!changes[i]) continue;
      const { insert, props, children, reset: _reset } = changes[i];
      const previousSibling = findPreviousSibling(element, i);
      if (insert)
        element.children[i] = render.call(this, element, element.children[i], { ...element.context }, previousSibling?.nextSibling);
      else {
        update.call(this, element.children[i], props, children, _reset);
        const firstNode = element.children[i].node || element.children[i].firstNode;
        if (!firstNode) continue;
        let referenceNode = null;
        if (previousSibling) {
          if (previousSibling.nextSibling !== firstNode) referenceNode = previousSibling.nextSibling;
          else continue;
        }
        else if (firstNode.parentNode.firstChild !== firstNode) referenceNode = firstNode.parentNode.firstChild;
        else continue;
        const lastNode = element.children[i].lastNode;
        mutate(element, "appendNode", firstNode, lastNode, referenceNode);
      }
    }
  }

  if (dequeue) this.queue.shift()?.();
}

// Utils

function diff(element, index, previous, reset, strict) {
  if (element == null || element === false) return [];
  if (Array.isArray(element)) element = new Element(Fragment, {}, element);
  if (!(element instanceof Element)) {
    if (previous[index] && previous[index].type === TextNode && previous[index].children[0] === element)
      return [previous.splice(index, 1, null)[0], { children: [element] }];
    for (let i = 0, len = previous.length; i < len; i++) {
      if (!previous[i]) continue;
      if (previous[i].type === TextNode && previous[i].children[0] === element)
        return [previous.splice(i, 1, null)[0], { children: [element] }];
    }
    if (strict) return [];
    if (previous[index] && previous[index].type === TextNode)
      return [previous.splice(index, 1, null)[0], { children: [element] }];
    return [createElement(TextNode, {}, "" + element), { insert: true }];
  }

  if (previous[index] && element.key != null && element.key === previous[index].key && element.type === previous[index].type && (element.type !== Component.Node || element.ref === previous[index].ref.constructor))
    return [previous.splice(index, 1, null)[0], { props: element.props, children: element.children }];
  if (previous[index] && element.id != null && element.id === previous[index].id && element.key === previous[index].key && element.type === previous[index].type && (element.type !== Component.Node || element.ref === previous[index].ref.constructor))
    return [previous.splice(index, 1, null)[0], { props: element.props, children: element.children, reset }];
  for (let i = 0, len = previous.length; i < len; i++) {
    if (!previous[i]) continue;
    if (element.key != null && element.key === previous[i].key && element.type === previous[i].type && (element.type !== Component.Node || element.ref === previous[i].ref.constructor))
      return [previous.splice(i, 1, null)[0], { props: element.props, children: element.children }];
    if (element.id != null && element.id === previous[i].id && element.key === previous[i].key && element.type === previous[i].type && (element.type !== Component.Node || element.ref === previous[i].ref.constructor))
      return [previous.splice(i, 1, null)[0], { props: element.props, children: element.children, reset }];
  }
  if (strict) return [];
  if (previous[index] && element.type === previous[index].type && element.key === previous[index].key) {
    if (element.type === Component.Node) {
      if (element.ref === previous[index].ref.constructor)
        return [previous.splice(index, 1, null)[0], { props: element.props, children: element.children, reset: true }];
    }
    else return [previous.splice(index, 1, null)[0], { props: element.props, children: element.children, reset: true }];
  }
  return [element, { insert: true }];
}

function setAttribute(node, name, value) {
  if (name === "validator" && typeof value === "function") return;
  if (/^on\w.*/.test(name) && typeof value === "function") {
    node[name.toLowerCase()] = (event, ...args) => {
      try {
        event.stritMode = () => {
          if (event.target !== node) throw STRICT_MODE;
        }
        value(event, ...args);
      }
      catch (e) {
        if (e !== STRICT_MODE) throw e;
      }
    };
    return;
  }
  if (name === "className") name = "class";
  if (value == null || value === false) node.removeAttribute(name);
  else if (name === "style" && typeof value === "object") {
    const keys = Object.keys(value);
    for (let i = 0, len = keys.length || 0; i < len; i++) node.style.setProperty(keys[i], value[keys[i]]);
  } else node.setAttribute(name, typeof value === "boolean" ? "" : value);
}

function duplicatedId(children, index) {
  const id = children[index]?.id;
  if (!id) return false;
  for (let i = 0, len = children.length; i < len; i++) {
    if (i == index) continue;
    if (children[i].id === id) return true;
  }
  return false;
}

function mutate(element, mutation, firstNode, lastNode, referenceNode) {
  if (!firstNode) return;
  if (!lastNode || firstNode === lastNode) element[mutation](firstNode, referenceNode);
  else {
    let currentNode = firstNode;
    while (currentNode) {
      const next = currentNode.nextSibling;
      element[mutation](currentNode, referenceNode);
      if (currentNode === lastNode) currentNode = null;
      else currentNode = next;
    }
  }
}

function findComponents(element, callback) {
  if (!element || !(element instanceof Element)) return;
  if (element.type === Component.Node) callback(element.ref);
  for (let i = 0, len = element?.children?.length || 0; i < len; i++) findComponents(element.children[i], callback);
}

function findPreviousSibling(parent, index) {
  for (let i = (index - 1); i >= 0; i--) {
    if (parent.children[i]?.node) return parent.children[i]?.node;
    if (parent.children[i]?.lastNode) return parent.children[i]?.lastNode;
  }
  if (parent.node) return null;
  const parentIndex = parent.parent.children.indexOf(parent);
  return findPreviousSibling(parent.parent, parentIndex != -1 ? parentIndex : parent.parent.children.length);
}