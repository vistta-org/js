import { Fragment, TextNode, Element, Mutation, Context, Ref, Component, Profiler, Suspense, Safe, Form } from "./classes";
import { applyTransition } from "./transitions";
import { isBrowser, capitalize } from "../utils";

const BUILD = process.env.BUILD;
const STRICT_MODE = new Error("Event strict mode active");

export default class VirtualDom {
  node = document.body;
  engine = {
    active: false,
    profilers: new Set(),
    queue(mutations) {
      const type = typeof mutations;
      let node = {};
      if (type === "function") node.callback = mutations;
      else if (type !== "object") throw "Internal Error #003";
      else node.iterator = mutations[Symbol.iterator]();
      this.first ||= node;
      if (this.last) this.last.next = node;
      this.last = node;
      if (!this.active) {
        this.active = true;
        this.next();
      }
    },
    next() {
      const cur = this.first;
      if (!cur) {
        this.last = null;
        this.active = false;
        const profilers = this.profilers;
        this.profilers = new Set();
        setTimeout(() => profilers.forEach((profiler) => profiler.end()), 0);
        return;
      }
      this.first = cur.next;
      if (cur.callback) cur.callback();
      else {
        const iterator = cur.iterator;
        let mutation = iterator.next().value;
        while (mutation) {
          mutation?.update?.();
          mutation = iterator.next().value;
        }
      }
      this.next();
    }
  }

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
    this.engine.active = true;
    this.node.innerHTML = "";
    this.content = render(this, this, content, {});
    this.mutation = null;
    const resolve = () => {
      this.children = [...this.node.childNodes];
      callback?.(this.config);
      this.engine.next();
    };
    if (BUILD || refresh) resolve();
    else applyTransition(this, this.config?.transition, resolve);
  }

  remove() {
    this.engine.active = false;
    traverseVirtualNodes(this.content, (virtualNode) => virtualNode.element.type === Component.Node && virtualNode?.component?.onDisconnect?.());
  }

  refresh(callback) {
    this.engine.active = true;
    const resolve = () => {
      this.node.replaceChildren(...this.children);
      traverseVirtualNodes(this.content, (virtualNode) => virtualNode.element.type === Component.Node && virtualNode?.component?.onConnect?.());
      callback?.(this.config);
      this.engine.next();
    }
    if (BUILD) return resolve();
    else applyTransition(this, this.config?.transition, resolve);
  }
}

// VDOM Manipulators

function render(virtualDom, parent, element, context, referenceNode) {
  if (element == null || element === false) return null;
  const virtualNode = { parent, context, element };
  if (!(element instanceof Element)) {
    if (Array.isArray(element)) element = new Element(Fragment, null, element);
    else if (element instanceof Mutation) {
      virtualNode.mutation = element;
      element = new Element(Fragment);
      if (isBrowser()) {
        if (context.profiler) virtualNode.mutation.update = context.profiler.record(virtualDom.engine, () => update(virtualDom, virtualNode, null, ensureArray(virtualNode.mutation())));
        else virtualNode.mutation.update = () => update(virtualDom, virtualNode, null, ensureArray(virtualNode.mutation()));
        virtualDom.mutation = (virtualNode.mutation.context = context, virtualNode.mutation);
      }
      element.children = ensureArray(virtualNode.mutation());
    }
    else if (typeof element === "object" || element instanceof Promise)
      throw new Error(`${capitalize(typeof element)} is not a valid Element`);
    else element = new Element(TextNode, null, "" + element);
    virtualNode.element = element;
  }

  if (element.type === TextNode) {
    virtualNode.node = virtualDom.createTextNode(element.children[0]);
    return (append(parent, virtualNode.node, referenceNode), virtualNode);
  }

  if (typeof element.type === "string") {
    if (element.key?.length > 0) {
      if (virtualDom.keys[element.key] == null)
        virtualDom.keys[element.key] = { type: element.type, node: virtualDom.createElement(element.type) };
      else if (virtualDom.keys[element.key].type !== element.type)
        throw new Error(`Key ${element.key} already in use.`);
      virtualNode.node = virtualDom.keys[element.key].node;
    }
    else virtualNode.node = virtualDom.createElement(element.type);
    const keys = Object.keys(element.props);
    for (let i = 0, len = keys.length; i < len; i++) {
      const prop = element.props[keys[i]];
      if (prop instanceof Mutation) {
        if (isBrowser()) {
          if (context.profiler) prop.update = context.profiler.record(virtualDom.engine, () => setAttribute(virtualNode.node, keys[i], prop()));
          else prop.update = () => setAttribute(virtualNode.node, keys[i], prop());
          virtualDom.mutation = (prop.context = context, prop);
        }
        setAttribute(virtualNode.node, keys[i], prop());
      }
      else setAttribute(virtualNode.node, keys[i], prop);
    }
    if (element.ref instanceof Mutation) throw "Internal Error #001";
    if (typeof element.ref === "function") element.ref(virtualNode.node);
    else if (element.ref instanceof Ref) element.ref.node = virtualNode.node;
    virtualNode.children = [];
    for (let i = 0, len = element.children.length; i < len; i++)
      virtualNode.children[i] = render(virtualDom, virtualNode, element.children[i], { ...context });
    context.form?.register(virtualNode);
    return (append(parent, virtualNode.node, referenceNode), virtualNode);
  }

  if (element.type === Component.Node) {
    virtualNode.component = element.component.prototype instanceof Component ? new element.component() : Object.assign(new Component(), element.component());
    if (element.component === Safe) {
      try {
        const fragment = { node: virtualDom.createDocumentFragment(), children: [] };
        for (let i = 0, len = element.props.children?.length || 0; i < len; i++)
          fragment.children[i] = render(virtualDom, fragment, element.props.children[i], { ...context });
        virtualNode.children = fragment.children;
        referenceNode ||= findReferenceNode(virtualNode, -1);
        let node = fragment.node.firstChild;
        while (node != null) {
          append(virtualNode, node, referenceNode);
          node = fragment.node.firstChild;
        }
        return virtualNode;
      }
      catch {
        virtualNode.children = [render(virtualDom, virtualNode, element.props.fallback, { ...context }, referenceNode)];
        return virtualNode;
      }
    }
    if (element.component === Suspense) {
      if (element.props.fallback) {
        element.children = [element.props.fallback];
        if (isBrowser()) {
          context.suspense = virtualNode.component;
          const fragment = { node: virtualDom.createDocumentFragment(), children: [] };
          for (let i = 0, len = element.props.children?.length || 0; i < len; i++)
            fragment.children[i] = render(virtualDom, fragment, element.props.children[i], { ...context });
          virtualNode.component.register(() => {
            virtualNode.children = fragment.children;
            for (let i = 0, len = virtualNode.children.length; i < len; i++)
              virtualNode.children[i].parent = virtualNode;
            const fallbackFirstNode = virtualNode.firstNode;
            if (fallbackFirstNode) {
              const fallbackLastNode = virtualNode.lastNode;
              if (!fallbackLastNode || fallbackFirstNode === fallbackLastNode) remove(virtualNode, fallbackFirstNode);
              else {
                let currentNode = fallbackFirstNode;
                while (currentNode) {
                  const next = currentNode.nextSibling;
                  remove(virtualNode, currentNode)
                  if (currentNode === fallbackLastNode) currentNode = null;
                  else currentNode = next;
                }
              }
            }

            referenceNode ||= findReferenceNode(virtualNode, -1);
            let node = fragment.node.firstChild;
            while (node != null) {
              append(virtualNode, node, referenceNode);
              node = fragment.node.firstChild;
            }
          });
          virtualDom.engine.queue(() => virtualNode.component.resolve(true));
        }
      }
      else element.children = element.props.children;
    }
    else {
      if (element.component === Form) {
        if (context.form) virtualNode.component.register(context.form);
        else context.form = virtualNode.component;
      }
      else if (element.component === Profiler) context.profiler = virtualNode.component;
      const properties = Object.getOwnPropertyNames(virtualNode.component);
      for (let i = 0, len = properties.length; i < len; i++) {
        const property = properties[i];
        if (virtualNode.component[property] instanceof Promise) {
          let value = null;
          let status = "pending";
          const mutations = new Set();
          virtualNode.component[property].then((result) => {
            value = result;
            status = "resolved";
            virtualDom.engine.queue(mutations);
          });
          Object.defineProperty(virtualNode.component, property, {
            configurable: false,
            enumerable: true,
            get: () => {
              if (!isBrowser()) return value;
              if (status === "completed") { /* Do Nothing */ }
              else if (status === "pending") {
                if (virtualDom.mutation) {
                  virtualDom.mutation.context?.suspense?.wait();
                  mutations.add(virtualDom.mutation);
                }
              }
              else if (status === "resolved") {
                status = "completed";
                virtualDom.engine.queue(() => mutations.forEach((mutation) => mutation.context?.suspense?.resolve()));
              }
              return value;
            },
          });
        }
        else if (virtualNode.component[property] instanceof Context) {
          const instance = virtualNode.component[property];
          let mutations = {};
          if (!context["#" + instance.key]) {
            context["#" + instance.key] = { instance, mutations };
            instance.register((path) => {
              const keys = Object.keys(mutations);
              for (let i = 0, len = keys.length; i < len; i++) {
                const key = keys[i];
                if ((key === path || key.startsWith(path + ".")) && mutations[key]) virtualDom.engine.queue(mutations[key]);
              }
            });
          }
          else mutations = context["#" + instance.key].mutations;
          Object.defineProperty(virtualNode.component, property, {
            configurable: false,
            enumerable: false,
            get: () => {
              const mutation = virtualDom.mutation;
              return instance.proxy((path) => {
                if (!mutation) return;
                if (!mutations[path]) mutations[path] = new Set();
                mutations[path].add(mutation);
              });
            }
          });
        }
        else if (!(virtualNode.component[property] instanceof Ref || typeof virtualNode.component[property] === "function")) {
          const mutations = new Set();
          let value = virtualNode.component[property];
          if (element.props[property] instanceof Mutation) {
            if (isBrowser()) {
              if (context.profiler) element.props[property].update = context.profiler.record(virtualDom.engine, () => virtualNode.component[property] = element.props[property]());
              else element.props[property].update = () => virtualNode.component[property] = element.props[property]();
              virtualDom.mutation = (element.props[property].context = context, element.props[property]);
            }
            value = element.props[property]();
          }
          else if (element.props[property] != null) value = element.props[property];
          Object.defineProperty(virtualNode.component, property, {
            configurable: false,
            enumerable: true,
            get: () => {
              if (virtualDom.mutation) mutations.add(virtualDom.mutation);
              return value;
            },
            set: (v) => {
              if (v === value) return;
              value = v;
              virtualDom.engine.queue(mutations);
            }
          });
        }
      }
      virtualNode.mutation = new Mutation(() => virtualNode.component.render());
      if (isBrowser()) {
        if (context.profiler) virtualNode.mutation.update = context.profiler.record(virtualDom.engine, () => update(virtualDom, virtualNode, null, ensureArray(virtualNode.component.render())));
        else virtualNode.mutation.update = () => update(virtualDom, virtualNode, null, ensureArray(virtualNode.component.render()));
        virtualDom.mutation = (virtualNode.mutation.context = context, virtualNode.mutation);
      }
      element.children = ensureArray(virtualNode.component.render());
    }
  }

  virtualNode.children = [];
  for (let i = 0, len = element.children.length; i < len; i++)
    virtualNode.children[i] = render(virtualDom, virtualNode, element.children[i], { ...context }, referenceNode);
  if (element.type === Component.Node && isBrowser()) virtualNode.component.onConnect?.();

  return virtualNode;
}

function update(virtualDom, virtualNode, props, children) {
  if (virtualNode.element.type === TextNode)
    return virtualNode.node.nodeValue = children[0];
  virtualDom.mutation = virtualNode.mutation;

  if (props && typeof props === "object") {
    if (typeof virtualNode.element.type === "string") {
      const keys = Object.keys(props);
      for (let i = 0, len = keys.length; i < len; i++)
        setAttribute(virtualNode.node, keys[i], props[keys[i]]);
    }
    else throw "Internal Error #002";
  }

  const previousChildren = [...virtualNode.children];
  const changes = [];
  for (let i = 0, len = children.length; i < len; i++)
    changes[i] = diff(children[i], i, previousChildren);

  for (let i = 0, len = previousChildren.length; i < len; i++) {
    if (!previousChildren[i]) continue;
    const firstNode = previousChildren[i].node || previousChildren[i].firstNode;
    if (firstNode) {
      const lastNode = previousChildren[i].lastNode;
      if (!lastNode || firstNode === lastNode) remove(virtualNode, firstNode);
      else {
        let currentNode = firstNode;
        while (currentNode) {
          const next = currentNode.nextSibling;
          remove(virtualNode, currentNode)
          if (currentNode === lastNode) currentNode = null;
          else currentNode = next;
        }
      }
    }
    traverseVirtualNodes(previousChildren[i], (_virtualNode) => {
      if (_virtualNode.element.type === Component.Node) _virtualNode?.component?.onDisconnect?.();
      if (_virtualNode.mutation) _virtualNode.mutation.update = null;
      const keys = Object.keys(_virtualNode.element.props);
      for (let i = 0, len = keys?.length || 0; i < len; i++) {
        if (_virtualNode.element.props[keys[i]] instanceof Mutation)
          _virtualNode.element.props[keys[i]].update = null;
      }
    });
  }

  virtualNode.children = [];
  for (let i = 0, len = changes.length; i < len; i++) {
    if (!changes[i]) continue;
    if (changes[i].skip != null) virtualNode.children[i] = changes[i].skip;
    else if (changes[i].insert != null)
      virtualNode.children[i] = render(virtualDom, virtualNode, changes[i].insert, { ...virtualNode.context }, findReferenceNode(virtualNode, i));
    else {
      let referenceNode = findReferenceNode(virtualNode, i);
      virtualNode.children[i] = changes[i].update;
      update(virtualDom, virtualNode.children[i], changes[i].props, changes[i].children);
      const firstNode = virtualNode.children[i].node || virtualNode.children[i].firstNode;
      if (!firstNode) continue;
      if (referenceNode) {
        if (referenceNode === firstNode) continue;
      }
      else if (firstNode.parentNode.firstChild !== firstNode) referenceNode = firstNode.parentNode.firstChild;
      else continue;
      const lastNode = virtualNode.children[i].lastNode;
      if (!lastNode || firstNode === lastNode) append(virtualNode, firstNode, referenceNode);
      else {
        let currentNode = firstNode;
        while (currentNode) {
          const next = currentNode.nextSibling;
          append(virtualNode, currentNode, referenceNode)
          if (currentNode === lastNode) currentNode = null;
          else currentNode = next;
        }
      }
    }
  }
  virtualDom.mutation = null;
}

//

function append(parent, node, referenceNode) {
  if (parent.element?.type === Fragment || parent.element?.type === Component.Node) {
    if (referenceNode) {
      let next = {};
      if (parent.firstNode === node && parent.firstNode !== parent.lastNode)
        next.firstNode = parent.firstNode.nextSibling;
      if (parent.lastNode === node && parent.firstNode !== parent.lastNode)
        next.lastNode = parent.lastNode.previousSibling;
      append(parent.parent, node, referenceNode);
      if (!parent.firstNode || parent.firstNode === node.nextSibling) parent.firstNode = node;
      else if (next.firstNode) parent.firstNode = next.firstNode;
      if (!parent.lastNode || parent.lastNode === node.previousSibling) parent.lastNode = node;
      else if (next.lastNode) parent.lastNode = next.lastNode;
    }
    else {
      if (parent.firstNode === node && parent.firstNode !== parent.lastNode)
        parent.firstNode = parent.firstNode.nextSibling;
      else parent.firstNode ||= node;
      parent.lastNode = node;
      append(parent.parent, node);
    }
  }
  else if (parent.element?.type !== TextNode) {
    if (referenceNode) parent.node.insertBefore(node, referenceNode);
    else parent.node.appendChild(node);
  }
}

function remove(parent, node) {
  if (parent.element?.type === Fragment || parent.element?.type === Component.Node) {
    if (parent.firstNode === node) {
      if (parent.firstNode === parent.lastNode)
        parent.firstNode = null, parent.lastNode = null;
      else parent.firstNode = parent.firstNode.nextSibling
    }
    else if (parent.lastNode === node)
      parent.lastNode = parent.lastNode.previousSibling;
    remove(parent.parent, node)
  }
  else if (parent.element?.type !== TextNode && parent.node === node.parentNode)
    parent.node.removeChild(node);
}

function diff(element, index, previous) {
  if (element == null || element === false) return null;
  if (!(element instanceof Element)) {
    if (Array.isArray(element)) element = new Element(Fragment, {}, element);
    else if (element instanceof Mutation) {
      for (let i = index, len = previous.length; i < len; i++) {
        const mutation = previous[i]?.mutation;
        if (mutation && mutation.callback === element)
          return { skip: previous.splice(index, 1, null)[0] };
      }
      for (let i = (index - 1); i >= 0; i--) {
        const mutation = previous[i]?.mutation;
        if (mutation && mutation.callback === element)
          return { skip: previous.splice(index, 1, null)[0] };
      }
      return { insert: element };
    }
    else {
      for (let i = index, len = previous.length; i < len; i++) {
        const previousElement = previous[i]?.element;
        if (previousElement && previousElement.type === TextNode && previousElement.children[0] === element)
          return { update: previous.splice(index, 1, null)[0], children: [element] };
      }
      for (let i = (index - 1); i >= 0; i--) {
        const previousElement = previous[i]?.element;
        if (previousElement && previousElement.type === TextNode && previousElement.children[0] === element)
          return { update: previous.splice(index, 1, null)[0], children: [element] };
      }
      return { insert: element };
    }
  }

  for (let i = index, len = previous.length; i < len; i++) {
    const previousElement = previous[i]?.element;
    if (previousElement && element.id === previousElement.id && element.key != null && element.key === previousElement.key && element.type === previousElement.type && (element.type !== Component.Node || element.component === previousElement.component))
      return { update: previous.splice(i, 1, null)[0], props: element.props, children: element.children };
  }
  for (let i = (index - 1); i >= 0; i--) {
    const previousElement = previous[i]?.element;
    if (previousElement && element.id === previousElement.id && element.key != null && element.key === previousElement.key && element.type === previousElement.type && (element.type !== Component.Node || element.component === previousElement.component))
      return { update: previous.splice(i, 1, null)[0], props: element.props, children: element.children };
  }
  return { insert: element };
}

function ensureArray(children) {
  if (!Array.isArray(children)) return [children];
  return children;
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

function findReferenceNode(parent, index) {
  for (let i = (index - 1); i >= 0; i--) {
    if (parent.children[i]?.node) return parent.children[i]?.node?.nextSibling;
    if (parent.children[i]?.lastNode) return parent.children[i]?.lastNode?.nextSibling;
  }
  if (parent.node) return parent.node.firstChild;
  const parentIndex = parent.parent.children.indexOf(parent);
  return findReferenceNode(parent.parent, parentIndex != -1 ? parentIndex : parent.parent.children.length);
}

function traverseVirtualNodes(node, callback) {
  if (!node) return;
  for (let i = 0, len = node?.children?.length || 0; i < len; i++) traverseVirtualNodes(node.children[i], callback);
  callback(node);
}