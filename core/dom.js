import { capitalize, ensureArray, join, proxy } from "../utils/index.js";
import {
  Component,
  Context,
  Element,
  Form,
  Fragment,
  Mutation,
  Profiler,
  Ref,
  Render,
  Safe,
  Suspense,
  TextNode,
} from "./classes.js";
import { VirtualStyleSheet } from "./stylesheet.js";
import { anchor } from "./utils.js";

const STRICT_MODE = new Error("Event strict mode active");
const INTERNAL_COMPONENTS = new Set([Form, Profiler, Render.If, Render.Each, Safe, Suspense]);
const isServer = !!/** @type {any} */ (window).isServer;
class VirtualDomError extends Error {
  constructor(message) {
    super(message);
    this.name = "Virtual Dom Error";
  }
}
let frameBudget = 8;
let lastFrameTime = 0;

class VirtualDom {
  active = false;
  running = false;
  queue = [];
  stylesheet = new VirtualStyleSheet();

  constructor(pathname, host, config) {
    this.pathname = pathname;
    this.host = host;
    this.config = config || {};
    this.stylesheet.add({
      "[suspended]": { display: "none !important" },
    });
    for (let i = 0, len = this.config?.styles?.length || 0; i < len; i++) this.stylesheet.add(this.config.styles[i]);
  }

  render(element) {
    this.active = true;
    this.running = true;
    const host = {
      type: VirtualDom,
      node: this.createElement("fragment"),
    };
    this.virtualTree = this.renderElement(host, element, {
      components: [],
    });
    this.replaceStyleSheets();
    this.host.replaceChildren(host.node);
    host.node = this.host;
    if (!isServer) requestAnimationFrame((frameTime) => this.update(frameTime));
    return this;
  }

  enqueue(mutations) {
    this.queue.push(...mutations);
    if (!this.active || this.running) return;
    this.running = true;
    requestAnimationFrame((frameTime) => this.update(frameTime));
  }

  update(frameTime = performance.now(), components = new Set(), profilers = new Set()) {
    if (Number.isFinite(frameTime)) {
      if (lastFrameTime > 0) {
        const interval = frameTime - lastFrameTime;
        if (interval > 0) frameBudget = Math.max(4, Math.min(16, interval - 2));
      }
      lastFrameTime = frameTime;
    }
    const startTime = performance.now();
    let index = 0;

    while (index < this.queue.length) {
      const mutation = this.queue[index++];
      mutation.update?.(components, profilers);
      if (performance.now() - startTime > frameBudget) {
        if (index > 0) this.queue.splice(0, index);
        return requestAnimationFrame((frameTime) => this.update(frameTime, components, profilers));
      }
    }

    if (index > 0) this.queue.length = 0;
    for (const component of components) component.onUpdate?.();
    for (const profiler of profilers) profiler.end?.();
    this.running = false;
  }

  disable() {
    if (!this.virtualTree) throw new VirtualDomError("Virtual Dom not rendered");
    traverseVirtualTree(this.virtualTree, (element) => {
      if (element.mutations) for (const mutation of element.mutations) this.disableMutation(mutation);
      element.component?.onDisconnect?.();
    });
    this.active = false;
    this.running = false;
  }

  enable() {
    if (!this.virtualTree) throw new VirtualDomError("Virtual Dom not rendered");
    this.active = true;
    this.running = true;
    traverseVirtualTree(this.virtualTree, (element) => {
      if (element.mutations) for (const mutation of element.mutations) this.enableMutation(mutation);
      element.component?.onConnect?.();
    });
    const fragment = this.createElement("fragment");
    const firstNode = this.virtualTree.node || this.virtualTree.firstNode;
    if (firstNode) {
      const lastNode = this.virtualTree.lastNode;
      if (!lastNode || firstNode === lastNode) fragment.appendChild(firstNode);
      else {
        let currentNode = firstNode;
        while (currentNode) {
          const next = currentNode.nextSibling;
          fragment.appendChild(currentNode);
          if (currentNode === lastNode) currentNode = null;
          else currentNode = next;
        }
      }
    }
    this.replaceStyleSheets();
    this.host.replaceChildren(fragment);
    this.update();
    return this;
  }

  replaceStyleSheets() {
    const ssr = document.querySelector("style[data-ssr]");
    document.adoptedStyleSheets = [this.stylesheet.content];
    if (ssr) ssr.remove();
  }

  createElement(type) {
    if (type === "fragment") return document.createDocumentFragment();
    const element = document.createElement(type);
    Object.defineProperty(element.style, "setProperty", {
      value: (property, value, priority) => this.stylesheet.setProperty(element, property, value, priority),
    });
    return element;
  }

  renderElement(parent, element, context, referenceNode) {
    if (!(element instanceof Element)) element = convertToElement(element);
    element.parent = parent;
    element.context = context;
    element.mutations = new Set();
    if (element.mutation)
      element.mutation = this.applyMutation({
        element,
        mutation: element.mutation,
        init: (value) => (element.children = ensureArray(value)),
        update: (value) => this.updateElement(element, null, ensureArray(value)),
      });

    if (element.type == null) {
      element.node = this.createTextNode("");
      appendElement(parent, element, referenceNode);
      return element;
    }

    if (element.type === TextNode) {
      element.node = this.createTextNode(element.children[0]);
      appendElement(parent, element, referenceNode);
      return element;
    }

    if (typeof element.type === "string") {
      if (element.key?.length > 0) {
        if (element.key instanceof Mutation) throw new VirtualDomError("Internal Error #002");
        if (!parent.keys) parent.keys = {};
        if (parent.keys[element.key] == null) parent.keys[element.key] = element;
        else if (parent.keys[element.key].type !== element.type)
          throw new VirtualDomError(`Key ${element.key} already in use.`);
        else {
          element = this.updateElement(parent.keys[element.key], element.props, element.children);
          appendElement(parent, element, referenceNode);
          traverseVirtualTree(element, (element) => {
            if (element.mutations) for (const mutation of element.mutations) this.enableMutation(mutation);
            element.component?.onConnect?.();
          });
          return element;
        }
      }
      element.node = this.createElement(element.type);
      if (element.ref instanceof Mutation) throw new VirtualDomError("Internal Error #003");
      if (typeof element.ref === "function") element.ref(element.node);
      else if (element.ref instanceof Ref) element.ref.node = element.node;
      element.attributes = {};
      const keys = Object.keys(element.props);
      const getDisabledOrReadOnly = () => getPropValue(element.props.disabled) || getPropValue(element.props.readOnly);
      const disabledOrReadOnly = getDisabledOrReadOnly();
      for (let i = 0, len = keys.length; i < len; i++) {
        const prop = element.props[keys[i]];
        if (prop instanceof Mutation)
          this.applyMutation({
            element,
            mutation: prop,
            init: (value) => this.setAttribute(element, keys[i], value, disabledOrReadOnly),
            update: (value) => this.setAttribute(element, keys[i], value, getDisabledOrReadOnly()),
          });
        else this.setAttribute(element, keys[i], prop, disabledOrReadOnly);
      }
      this.renderElementChildren(element, element.children, context);
      appendElement(parent, element, referenceNode);
      context.form?.register(element);
      return element;
    }

    if (element.type === Fragment)
      return (this.renderElementChildren(element, element.children, context, referenceNode), element);

    if (element.type === Component.Node) {
      let component;
      const hasKey = element.key?.length > 0;
      if (hasKey) {
        if (element.key instanceof Mutation) throw new VirtualDomError("Internal Error #002");
        if (!parent.keys) parent.keys = {};
        const existing = parent.keys[element.key];
        if (existing != null) {
          if (existing.type !== element.Component) throw new VirtualDomError(`Key ${element.key} already in use.`);
          const previous = existing.element;
          previous.parent = parent;
          const stack = [previous];
          while (stack.length > 0) {
            const current = stack.pop();
            for (let i = 0, len = current.children.length; i < len; i++) {
              const child = current.children[i];
              if (child.node) appendElement(child.parent, child, referenceNode);
              else stack.push(child);
            }
          }
          traverseVirtualTree(previous, (element) => {
            if (element.mutations) for (const mutation of element.mutations) this.enableMutation(mutation);
            element.component?.onConnect?.();
          });
          return {
            ...previous,
            ...element,
          };
        }
      }

      if (element.Component.prototype instanceof Component) component = new element.Component();
      else {
        component = element.Component();
        if (typeof component !== "object" || typeof component.render !== "function")
          throw new VirtualDomError("Invalid Function Component format");
        component = Object.assign(new Component(), component);
      }
      if (hasKey) parent.keys[element.key] = { type: element.Component, element };
      element.component = component;
      element.attributes = {};
      const mutation = new Mutation(() => component.render());
      const internal = INTERNAL_COMPONENTS.has(element.Component);
      if (element.Component === Profiler && "production" !== process.env.NODE_ENV) context.profiler = component;
      else if (element.Component === Form) {
        if (context.form) component.register(context.form);
        else context.form = component;
      } else if (element.Component === Safe) {
        context.safe = component;
        context.safe.catch = (error) => {
          console.error(error);
          context.safe.error = error;
        };
      }

      if (!internal) {
        context.components.push(component);
        const keys = Object.keys(element.props);
        for (let i = 0, len = keys.length; i < len; i++) component[keys[i]] ??= true;
      }

      const propertyNames = Object.getOwnPropertyNames(component);
      for (let i = 0, len = propertyNames.length; i < len; i++) {
        const propertyName = propertyNames[i];
        if (propertyName === "constructor") continue;
        if (propertyName === "render" || propertyName === "onConnect" || propertyName === "onDisconnect") {
          if (internal) continue;
          Object.defineProperty(component, propertyName, {
            configurable: false,
            enumerable: false,
            value: component[propertyName].bind(component),
          });
        } else if (propertyName === "onUpdate") {
          if (internal) continue;
          const previous = {};
          const original = component.onUpdate;
          const previousProxy = proxy(previous, { readonly: true });
          Object.defineProperty(component, "onUpdate", {
            configurable: false,
            enumerable: false,
            value: () => {
              original.call(component, previousProxy);
              Object.assign(previous, element.attributes);
            },
          });
          Object.assign(previous, element.attributes);
        } else if (propertyName === "children") {
          Object.defineProperty(component, "children", {
            get() {
              return element.props.children;
            },
            configurable: false,
            enumerable: false,
          });
        } else if (component[propertyName] instanceof Context) {
          const instance = component[propertyName];
          if (!element.context["#" + instance.key]) {
            const mutations = {};
            element.context["#" + instance.key] = instance.proxy({
              get: (path) => {
                if (!this.mutation) return;
                if (!mutations[path]) mutations[path] = new Set();
                this.trackMutation(this.mutation, mutations[path]);
              },
              set: (path) => mutations[path] && this.enqueue(mutations[path]),
            });
          }
          Object.defineProperty(component, propertyName, {
            configurable: false,
            enumerable: false,
            get: () => element.context["#" + instance.key],
          });
        } else {
          const mutations = new Set();
          element.attributes[propertyName] = component[propertyName];
          if (element.props[propertyName] instanceof Mutation) {
            const mutation = element.props[propertyName];
            this.applyMutation({
              element,
              mutation,
              init: (value) => (element.attributes[propertyName] = value),
              update: (value) => {
                element.attributes[propertyName] = value;
                if (mutations.size > 0) this.enqueue(mutations);
              },
            });
          } else if (element.props[propertyName] != null) element.attributes[propertyName] = element.props[propertyName];

          if (element.attributes[propertyName] instanceof Promise) {
            let fulfilled = false;
            let resolve;
            if (!isServer)
              element.attributes[propertyName].then((result) => {
                element.attributes[propertyName] = result;
                fulfilled = true;
                resolve?.();
                if (mutations.size > 0) this.enqueue(mutations);
              });
            Object.defineProperty(component, propertyName, {
              configurable: false,
              enumerable: true,
              get: () => {
                if (this.mutation) this.trackMutation(this.mutation, mutations);
                if (!fulfilled && context.suspense) resolve = context.suspense();
                return element.attributes[propertyName];
              },
              set: (v) => {
                if (v === element.attributes[propertyName]) return;
                element.attributes[propertyName] = v;
                if (mutations.size > 0) this.enqueue(mutations);
              },
            });
          } else
            Object.defineProperty(component, propertyName, {
              configurable: false,
              enumerable: true,
              get: () => {
                if (this.mutation) this.trackMutation(this.mutation, mutations);
                return element.attributes[propertyName];
              },
              set: (v) => {
                if (v === element.attributes[propertyName]) return;
                element.attributes[propertyName] = v;
                if (mutations.size > 0) this.enqueue(mutations);
              },
            });
        }
      }

      let init = (value) => this.renderElementChildren(element, ensureArray(value), context, referenceNode);
      let update = (value) => this.updateElement(element, null, ensureArray(value));
      if (element.Component === Suspense) {
        let activate = false;
        let active = true;
        let pending = 0;
        const fragment = {
          node: this.createElement("fragment"),
          context,
        };
        context.suspense = () => {
          pending++;
          if (pending > 0 && !activate) {
            activate = true;
            this.enqueue([context.suspense]);
          }
          return () => {
            pending--;
            if (pending == 0 && activate) {
              activate = false;
              this.enqueue([context.suspense]);
            }
          };
        };
        context.suspense.update = () => {
          if (activate) {
            if (active) return;
            active = true;
            const referenceNode = element.lastNode?.nextSibling;
            for (let i = 0, len = element.children.length; i < len; i++) {
              if (!element.children[i]) continue;
              transferElementToFragment(fragment.node, element.children[i]);
              element.children[i].parent = fragment;
            }
            element.children = [];
            this.renderElementChildren(element, [component.fallback], context, referenceNode);
          } else {
            if (!active) return;
            active = false;
            const referenceNode = element.lastNode?.nextSibling;
            for (let i = 0, len = element.children.length; i < len; i++) {
              if (!element.children[i]) continue;
              removeElement(element.children[i]);
              traverseVirtualTree(element.children[i], (element) => {
                if (element.mutations) for (const mutation of element.mutations) this.disableMutation(mutation);
                element.component?.onDisconnect?.();
              });
            }
            element.children = fragment.children;
            for (let i = 0, len = element.children.length; i < len; i++) element.children[i].parent = element;
            appendFragment(element, fragment.node, referenceNode);
          }
        };
        component.onConnect = () => !activate && this.enqueue([context.suspense]);
        init = (value) => {
          this.renderElementChildren(element, [component.fallback], context, referenceNode);
          this.renderElementChildren(fragment, ensureArray(value), context, referenceNode);
        };
        update = () => { };
      }

      element.mutation = this.applyMutation({
        element,
        mutation,
        init,
        update,
      });
      if (!isServer && component.onConnect) this.preventMutation(() => component.onConnect?.());
      return element;
    }

    throw new VirtualDomError("Unknown Element type");
  }

  updateElement(element, props, children) {
    if (element.type === null) return element;
    if (element.type === TextNode) {
      if (children[0] !== element.node.textContent) element.node.textContent = children[0];
      return element;
    }

    if (element.type !== Component.Node && element.type !== Fragment) {
      const keys = Object.keys(props);
      for (let i = 0, len = keys.length; i < len; i++) {
        const prop = props[keys[i]];
        if (prop instanceof Mutation && element.props[keys[i]] !== prop) {
          element.props[keys[i]].callback = prop.callback;
          this.enqueue([element.props[keys[i]]]);
        }
      }
      if (props?.["anchor"] !== undefined) element.node.anchor?.update();
    }

    const previous = [...element.children];
    element.children = [];
    for (let i = 0, len = children.length; i < len; i++) {
      let child = children[i];
      if (!(child instanceof Element)) child = convertToElement(child);
      if (!previous[i]?.key || !child.key || previous[i].key !== child.key) continue;
      element.children[i] = previous[i];
      previous[i] = null;
    }
    let referenceNode = element.node ? null : element.lastNode?.nextSibling;

    for (let i = 0, len = previous.length; i < len; i++) {
      if (!previous[i]) continue;
      removeElement(previous[i]);
      traverseVirtualTree(previous[i], (element) => {
        if (element.mutations) for (const mutation of element.mutations) this.disableMutation(mutation);
        element.component?.onDisconnect?.();
      });
    }

    for (let i = children.length - 1; i >= 0; i--) {
      if (!element.children[i]) {
        const childContext = Object.create(element.context);
        childContext.components = childContext.components.slice();
        element.children[i] = this.renderElement(element, children[i], childContext, referenceNode);
      }
      referenceNode = element.children[i].node || element.children[i].firstNode;
    }

    return element;
  }

  renderElementChildren(element, children, context, referenceNode) {
    element.children = [];
    if (!children || children.length === 0)
      return (element.children[0] = this.renderElement(element, new Element(null), null, referenceNode));
    for (let i = 0, len = children.length; i < len; i++) {
      const childContext = Object.create(context);
      childContext.components = childContext.components.slice();
      element.children[i] = this.renderElement(element, children[i], childContext, referenceNode);
    }
  }

  createTextNode(value) {
    return document.createTextNode(value);
  }

  setAttribute(element, name, value, disabledOrReadOnly) {
    if (element.attributes[name] === value) return;
    element.attributes[name] = value;
    if (name === "validator" && typeof value === "function") return;
    const node = element.node;
    if (name === "anchor") return (node.anchor = !isServer && anchor(element, value));
    if (!disabledOrReadOnly && name[0] === "o" && name[1] === "n") {
      node[name.toLowerCase()] = typeof value === "function" ? (event, ...args) => {
        try {
          event.strictMode = () => {
            if (event.target !== node) throw STRICT_MODE;
          };
          value(event, ...args);
        } catch (e) {
          if (e !== STRICT_MODE) throw e;
        }
      } : null;
      return;
    }
    if (name === "className") name = "class";
    if (value == null || value === false) node.removeAttribute(name);
    else if (name === "value") node.value = value;
    else if (name === "style") node.setAttribute(name, this.stylesheet.resolve(value));
    else if (name === "class" && Array.isArray(value)) node.setAttribute(name, join(value, " "));
    else node.setAttribute(name, typeof value === "boolean" ? "" : value);
  }

  applyMutation({ element, mutation, init, update }) {
    mutation.update = (components, profilers) => {
      if (mutation.disabled) return;
      const previousMutation = this.mutation;
      this.mutation = mutation;
      try {
        const len = element.context.components.length;
        if (len > 0) for (let i = 0; i < len; i++) components.add(element.context.components[i]);
        const stop = element?.context?.profiler?.record?.();
        const result = mutation();
        if (result instanceof Promise) {
          const resolve = element?.context?.suspense?.();
          result.then((v) => {
            this.enqueue([
              {
                update: () => {
                  const stop = element?.context?.profiler?.record?.();
                  update(v);
                  stop?.();
                },
              },
            ]);
            resolve?.();
          });
        } else update(result);
        stop?.((profiler) => profilers.add(profiler));
      } catch (e) {
        if (element?.context?.safe) element.context.safe.catch(e);
        else throw e;
      }
      this.mutation = previousMutation;
    };
    const previousMutation = this.mutation;
    this.mutation = mutation;
    try {
      const result = mutation();
      if (result instanceof Promise) {
        const resolve = element?.context?.suspense?.();
        if (!isServer)
          result.then(() => {
            this.enqueue([mutation]);
            resolve?.();
          });
        init(null);
      } else init(result);
    } catch (e) {
      if (element?.context?.safe) element.context.safe.catch(e);
      else throw e;
    }
    this.mutation = previousMutation;
    element.mutations.add(mutation);
    return mutation;
  }

  trackMutation(mutation, set) {
    if (!mutation.tracked) mutation.tracked = new Set();
    mutation.tracked.add(set);
    set.add(mutation);
  }

  enableMutation(mutation) {
    if (!mutation.tracked) return;
    mutation.disabled = undefined;
    for (const set of mutation.tracked) set.add(mutation);
  }

  disableMutation(mutation) {
    if (!mutation.tracked) return;
    mutation.disabled = true;
    for (const set of mutation.tracked) set.delete(mutation);
  }

  preventMutation(callback) {
    const previousMutation = this.mutation;
    this.mutation = null;
    callback();
    this.mutation = previousMutation;
  }
}

export { VirtualDom };

function convertToElement(element) {
  if (element === null || element === undefined || element === false) return new Element(null);
  if (Array.isArray(element)) return new Element(Fragment, null, element);
  else if (element instanceof Mutation) {
    const mutation = element;
    element = new Element(Fragment);
    element.mutation = mutation;
    return element;
  } else if (typeof element === "function") return new Element(element);
  else if (typeof element === "object" || element instanceof Promise)
    throw new VirtualDomError(`${capitalize(typeof element)} is not a valid Element`);
  return new Element(TextNode, null, "" + element);
}

function appendFragment(parent, fragment, referenceNode) {
  if (parent.type === Fragment || parent.type === Component.Node) {
    if (referenceNode) {
      if (!parent.firstNode) parent.firstNode = fragment.firstChild;
      else if (referenceNode === parent.firstNode) parent.firstNode = fragment.firstChild;
      if (!parent.lastNode) parent.lastNode = fragment.lastChild;
      else if (referenceNode.previousSibling === parent.lastNode) parent.lastNode = fragment.lastChild;
      appendFragment(parent.parent, fragment, referenceNode);
    } else {
      if (!parent.firstNode) parent.firstNode = fragment.firstChild;
      parent.lastNode = fragment.lastChild;
      appendFragment(parent.parent, fragment);
    }
    return;
  }

  if (referenceNode) parent.node.insertBefore(fragment, referenceNode);
  else parent.node.appendChild(fragment);
}

function transferElementToFragment(fragment, element) {
  const firstNode = element.node || element.firstNode;
  const remove = (parent, node) => {
    while (parent.type === Fragment || parent.type === Component.Node) {
      if (parent.firstNode === node) {
        if (parent.firstNode === parent.lastNode) ((parent.firstNode = null), (parent.lastNode = null));
        else parent.firstNode = parent.firstNode.nextSibling;
      } else if (parent.lastNode === node) parent.lastNode = parent.lastNode.previousSibling;
      parent = parent.parent;
    }
    fragment.appendChild(node);
  };
  if (firstNode) {
    const lastNode = element.lastNode;
    if (!lastNode || firstNode === lastNode) remove(element.parent, firstNode);
    else {
      let currentNode = firstNode;
      while (currentNode) {
        const next = currentNode.nextSibling;
        remove(element.parent, currentNode);
        if (currentNode === lastNode) currentNode = null;
        else currentNode = next;
      }
    }
  }
}

function appendElement(parent, element, referenceNode) {
  if (parent.type === Fragment || parent.type === Component.Node) {
    if (referenceNode) {
      if (!parent.firstNode) parent.firstNode = element.node || element.firstNode;
      else if (referenceNode === parent.firstNode) parent.firstNode = element.node || element.firstNode;
      if (!parent.lastNode) parent.lastNode = element.node || element.lastNode;
      else if (referenceNode.previousSibling === parent.lastNode) parent.lastNode = element.node || element.lastNode;
      appendElement(parent.parent, element, referenceNode);
    } else {
      if (!parent.firstNode) parent.firstNode = element.node || element.firstNode;
      parent.lastNode = element.node || element.lastNode;
      appendElement(parent.parent, element);
    }
    return;
  }

  const firstNode = element.node || element.firstNode;
  const lastNode = element.lastNode;
  if (!lastNode || firstNode === lastNode) {
    if (referenceNode) parent.node.insertBefore(firstNode, referenceNode);
    else parent.node.appendChild(firstNode);
  } else {
    let currentNode = firstNode;
    while (currentNode) {
      const next = currentNode.nextSibling;
      if (referenceNode) parent.node.insertBefore(currentNode, referenceNode);
      else parent.node.appendChild(currentNode);
      if (currentNode === lastNode) currentNode = null;
      else currentNode = next;
    }
  }
}

function removeElement(element) {
  const firstNode = element.node || element.firstNode;
  const remove = (parent, node) => {
    while (parent.type === Fragment || parent.type === Component.Node) {
      if (parent.firstNode === node) {
        if (parent.firstNode === parent.lastNode) ((parent.firstNode = null), (parent.lastNode = null));
        else parent.firstNode = parent.firstNode.nextSibling;
      } else if (parent.lastNode === node) parent.lastNode = parent.lastNode.previousSibling;
      parent = parent.parent;
    }
    parent.node.removeChild(node);
  };
  if (firstNode) {
    const lastNode = element.lastNode;
    if (!lastNode || firstNode === lastNode) remove(element.parent, firstNode);
    else {
      let currentNode = firstNode;
      while (currentNode) {
        const next = currentNode.nextSibling;
        remove(element.parent, currentNode);
        if (currentNode === lastNode) currentNode = null;
        else currentNode = next;
      }
    }
  }
}

function traverseVirtualTree(element, callback) {
  if (!element) return;
  const stack = [element];
  while (stack.length > 0) {
    const current = stack.pop();
    callback(current);
    if (current.type === TextNode) continue;
    const children = current.children;
    if (children && children.length) {
      for (let i = 0, len = children.length; i < len; i++) {
        const child = children[i];
        if (child) stack.push(child);
      }
    }
  }
}

function getPropValue(prop) {
  if (prop instanceof Mutation) return prop();
  return prop;
}
