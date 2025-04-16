import {
  Fragment,
  TextNode,
  Element,
  Mutation,
  Context,
  Ref,
  Component,
  Profiler,
  Suspense,
  Safe,
  Form,
} from "./classes.js";
import {
  RESOURCES_PATH,
  capitalize,
  ensureArray,
  addUnique,
} from "../utils/index.js";

const STRICT_MODE = new Error("Event strict mode active");
let componentMutationCount = 0;
class VirtualDomError extends Error {
  constructor(message) {
    super(message);
    this.name = "Virtual Dom Error";
  }
}

class VirtualDom {
  active = false;
  running = false;
  queue = [];
  keys = {};
  affectedComponents = [];
  profilers = [];
  styleSheets = {};

  constructor(pathname, host, config) {
    this.pathname = pathname;
    this.host = host;
    this.config = config;
  }

  createElement(type) {
    if (type === "fragment") return document.createDocumentFragment();
    return document.createElement(type);
  }

  createTextNode(value) {
    return document.createTextNode(value);
  }

  setAttribute(element, name, value, disabledOrReadOnly) {
    if (
      (name === "validator" && typeof value === "function") ||
      element.attributes[name] === value
    )
      return;
    element.attributes[name] = value;
    const node = element.node;
    if (
      !disabledOrReadOnly &&
      /^on\w.*/.test(name) &&
      typeof value === "function"
    ) {
      node[name.toLowerCase()] = (event, ...args) => {
        try {
          event.stritMode = () => {
            if (event.target !== node) throw STRICT_MODE;
          };
          value(event, ...args);
        } catch (e) {
          if (e !== STRICT_MODE) throw e;
        }
      };
      return;
    }
    if (name === "className") name = "class";
    if (value == null || value === false) node.removeAttribute(name);
    else if (name === "value") node.value = value;
    else if (name === "style" && typeof value === "object") {
      const keys = Object.keys(value);
      for (let i = 0, len = keys.length || 0; i < len; i++)
        node.style.setProperty(keys[i], value[keys[i]]);
    } else node.setAttribute(name, typeof value === "boolean" ? "" : value);
    if (name.startsWith("style-") && value)
      this.addStyleSheet(name.replace("style-", ""), true);
    if (!window.isServer && name === "id" && value)
      node.style.setProperty("anchor-name", `--a_${value.toLowerCase()}`);
    if (name === "anchor")
      node.style.setProperty("position-anchor", `--a_${value.toLowerCase()}`);
  }

  render(element) {
    this.active = true;
    this.running = true;
    const host = {
      type: VirtualDom,
      node: this.createElement("fragment"),
    };
    this.virtualTree = renderElement(this, host, element, {
      depth: 0,
      components: [],
    });
    if (!window.isServer) {
      for (let i = 0, len = this.config?.styles?.length || 0; i < len; i++)
        this.addStyleSheet(
          Object.keys(this.config.styles[i])[0].replace("style-", "")
        );
      this.replaceStyleSheets();
    }
    this.host.replaceChildren(host.node);
    host.node = this.host;
    if (!window.isServer) {
      this.snapshot = createPageSnapshot();
      requestAnimationFrame(() => this.update());
    }
    return this;
  }

  enqueue(mutations) {
    if (!Array.isArray(mutations))
      throw new VirtualDomError("Internal Error #001");
    this.queue.push(...mutations);
    if (!this.active || this.running) return;
    this.running = true;
    this.snapshot = createPageSnapshot();
    requestAnimationFrame(() => this.update());
  }

  update() {
    const startTime = performance.now();
    while (this.queue.length > 0) {
      const mutation = this.queue.shift();
      mutation.update?.();
      // Break to avoid exceeding frame budget
      if (performance.now() - startTime > 16)
        return requestAnimationFrame(() => this.update());
    }

    const affectedComponents = this.affectedComponents;
    this.affectedComponents = [];
    for (let i = 0, len = affectedComponents.length; i < len; i++)
      affectedComponents[i].onUpdate?.();
    const profilers = this.profilers;
    this.profilers = [];
    for (let i = 0, len = profilers.length; i < len; i++) profilers[i].end();
    restorePageSnapshot(this.snapshot);
    this.running = false;
  }

  disable() {
    if (!this.virtualTree)
      throw new VirtualDomError("Virtual Dom not rendered");
    traverseVirtualTree(this.virtualTree, (element) => {
      if (element.type === Component.Node) element.component?.onDisconnect?.();
    });
    this.active = false;
    this.running = false;
  }

  enable() {
    if (!this.virtualTree)
      throw new VirtualDomError("Virtual Dom not rendered");
    this.active = true;
    this.running = true;
    traverseVirtualTree(this.virtualTree, (element) => {
      if (element.type === Component.Node) element.component?.onConnect?.();
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
    this.next();
    return this;
  }

  addStyleSheet(style, scoped) {
    style = `/${RESOURCES_PATH}/${style}${scoped ? ".scoped" : ""}.css`;
    if (this.styleSheets[style]) return;
    let stylesheet = document.querySelector(
      `link[rel="stylesheet"][href="${style}"]`
    );
    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = style;
      document.head.appendChild(stylesheet);
    }
    this.styleSheets[style] = stylesheet;
  }

  replaceStyleSheets() {
    const existing = document.head.querySelectorAll(`link[rel="stylesheet"]`);
    const skip = {};
    for (let i = 0, len = existing.length; i < len; i++) {
      const current = existing[i];
      const href = current.href.replace(current.baseURI, "/");
      skip[href] = true;
      if (this.styleSheets[href]) continue;
      current.remove();
    }
    const keys = Object.keys(this.styleSheets);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (skip[keys[i]]) continue;
      document.head.appendChild(this.styleSheets[keys[i]]);
    }
  }
}

export { VirtualDom };

function renderElement(virtualDom, parent, element, context, referenceNode) {
  if (element == null || element === false) return null;
  if (!(element instanceof Element)) {
    if (Array.isArray(element)) element = new Element(Fragment, null, element);
    else if (element instanceof Mutation) {
      const mutation = element;
      element = new Element(Fragment);
      element.id = mutation.id;
      element.mutations = [];
      element.mutation = applyMutation(
        virtualDom,
        element,
        mutation,
        evalMutation(mutation, (value) =>
          updateElement(virtualDom, element, null, ensureArray(value))
        ),
        evalMutationAsync(
          virtualDom,
          mutation,
          (value) => (element.children = ensureArray(value))
        )
      );
    } else if (typeof element === "function") element = new Element(element);
    else if (typeof element === "object" || element instanceof Promise)
      throw new VirtualDomError(
        `${capitalize(typeof element)} is not a valid Element`
      );
    else element = new Element(TextNode, null, "" + element);
  } else if (element.type == null) return null;
  element.mutations = [];
  element.parent = parent;
  element.context = context;

  // Text Node
  if (element.type === TextNode) {
    element.node = virtualDom.createTextNode(element.children[0]);
    appendElement(parent, element, referenceNode);
    return element;
  }

  // Element Node
  if (typeof element.type === "string") {
    if (element.key?.length > 0) {
      if (element.key instanceof Mutation)
        throw new VirtualDomError("Internal Error #002");
      if (virtualDom.keys[element.key] == null)
        virtualDom.keys[element.key] = {
          type: element.type,
          node: virtualDom.createElement(element.type),
        };
      else if (virtualDom.keys[element.key].type !== element.type)
        throw new VirtualDomError(`Key ${element.key} already in use.`);
      element.node = virtualDom.keys[element.key].node;
    } else element.node = virtualDom.createElement(element.type);
    if (element.ref instanceof Mutation)
      throw new VirtualDomError("Internal Error #003");
    if (typeof element.ref === "function") element.ref(element.node);
    else if (element.ref instanceof Ref) element.ref.node = element.node;
    element.node._element = element;

    element.attributes = {};
    const keys = Object.keys(element.props);
    const disabledOrReadOnly =
      getPropValue(element.props.disabled) ||
      getPropValue(element.props.readOnly);
    for (let i = 0, len = keys.length; i < len; i++) {
      const prop = element.props[keys[i]];
      if (prop instanceof Mutation)
        applyMutation(
          virtualDom,
          element,
          prop,
          evalMutation(prop, (value) =>
            virtualDom.setAttribute(
              element,
              keys[i],
              value,
              getPropValue(element.props.disabled) ||
                getPropValue(element.props.readOnly)
            )
          ),
          evalMutationAsync(virtualDom, prop, (value) =>
            virtualDom.setAttribute(element, keys[i], value, disabledOrReadOnly)
          )
        );
      else virtualDom.setAttribute(element, keys[i], prop, disabledOrReadOnly);
    }
    renderElementChildren(virtualDom, element, element.children, context);
    appendElement(parent, element, referenceNode);
    context.form?.register(element);
    return element;
  }

  // Fragment Node
  if (element.type === Fragment)
    return (
      renderElementChildren(
        virtualDom,
        element,
        element.children,
        context,
        referenceNode
      ),
      element
    );

  // Component Node
  if (element.type === Component.Node) {
    let component;
    const hasKey = element.key?.length > 0;
    if (hasKey) {
      if (element.key instanceof Mutation)
        throw new VirtualDomError("Internal Error #002");
      if (virtualDom.keys[element.key] != null) {
        if (virtualDom.keys[element.key].type !== element.Component)
          throw new VirtualDomError(`Key ${element.key} already in use.`);
        const previous = virtualDom.keys[element.key].element;
        previous.parent = parent;
        const appendChildren = (element) => {
          for (let i = 0, len = element.children.length; i < len; i++) {
            const child = element.children[i];
            if (child.node) appendElement(child.parent, child, referenceNode);
            else appendChildren(child);
          }
        };
        appendChildren(previous);
        traverseVirtualTree(
          previous,
          (element) =>
            element.type === Component.Node && element.component?.onConnect?.()
        );
        return {
          ...previous,
          ...element,
        };
      }
    }

    if (element.Component.prototype instanceof Component)
      component = new element.Component();
    else {
      component = element.Component();
      if (
        typeof component !== "object" ||
        typeof component.render !== "function"
      )
        throw new VirtualDomError("Invalid Function Component format");
      component = Object.assign(new Component(), component);
    }
    if (hasKey)
      virtualDom.keys[element.key] = { type: element.Component, element };

    context.components.push(component);
    element.attributes = {};
    let changedProps = {};
    //
    if (element.Component === Form) {
      if (context.form) component.register(context.form);
      else context.form = component;
    } else if (
      element.Component === Profiler &&
      "production" !== process.env.NODE_ENV
    ) {
      addUnique(virtualDom.profilers, component);
      context.profiler = component;
    } else if (element.component === Safe) context.safe = component;
    const keys = Object.keys(element.props);
    for (let i = 0, len = keys.length; i < len; i++)
      component[keys[i]] ??= true;
    const propertyNames = Object.getOwnPropertyNames(component);
    for (let i = 0, len = propertyNames.length; i < len; i++) {
      const propertyName = propertyNames[i];
      if (
        propertyName === "render" ||
        propertyName === "onConnect" ||
        propertyName === "onDisconnect"
      )
        Object.defineProperty(component, propertyName, {
          configurable: false,
          enumerable: false,
          value: component[propertyName].bind(component),
        });
      else if (propertyName === "onUpdate") {
        const original = component.onUpdate;
        Object.defineProperty(component, "onUpdate", {
          configurable: false,
          enumerable: false,
          value: () => (
            original.call(component, changedProps), (changedProps = {})
          ),
        });
      } else if (component[propertyName] instanceof Context) {
        const instance = component[propertyName];
        if (!context["#" + instance.key]) {
          const mutations = {};
          const previous = {};
          context["#" + instance.key] = instance.proxy({
            get: (path, value) => {
              if (!mutations[path]) mutations[path] = [];
              if (!virtualDom.mutation) return;
              addUnique(mutations[path], virtualDom.mutation);
              previous[path] = value;
            },
            set: (path, value) => {
              if (previous[path] == value) return;
              previous[path] = value;
              changedProps[propertyName] = true;
              if (mutations[path]) virtualDom.enqueue(mutations[path]);
            },
          });
        }
        Object.defineProperty(component, propertyName, {
          configurable: false,
          enumerable: false,
          get: () => context["#" + instance.key],
        });
      } else {
        const mutations = [];
        element.attributes[propertyName] = component[propertyName];
        if (element.props[propertyName] instanceof Mutation) {
          const mutation = element.props[propertyName];
          mutation.context = { mutations };
          applyMutation(
            virtualDom,
            element,
            mutation,
            evalMutation(mutation, (value) => {
              element.attributes[propertyName] = value;
              virtualDom.enqueue(mutations);
            }),
            evalMutationAsync(
              virtualDom,
              mutation,
              (value) => (element.attributes[propertyName] = value)
            )
          );
        } else if (element.props[propertyName] != null)
          element.attributes[propertyName] = element.props[propertyName];
        if (element.attributes[propertyName] instanceof Promise) {
          let fulfilled = false;
          let suspense;
          if (!window.isServer)
            element.attributes[propertyName].then((result) => {
              element.attributes[propertyName] = result;
              fulfilled = true;
              suspense?.resolve?.();
              virtualDom.enqueue(mutations);
            });
          Object.defineProperty(component, propertyName, {
            configurable: false,
            enumerable: true,
            get: () => {
              if (virtualDom.mutation)
                addUnique(mutations, virtualDom.mutation);
              if (!fulfilled && virtualDom.suspense)
                suspense = virtualDom.suspense.register();
              return element.attributes[propertyName];
            },
            set: (v) => {
              if (v === element.attributes[propertyName]) return;
              element.attributes[propertyName] = v;
              changedProps[propertyName] = true;
              virtualDom.enqueue(mutations);
            },
          });
        } else
          Object.defineProperty(component, propertyName, {
            configurable: false,
            enumerable: propertyName !== "children",
            get: () => {
              if (virtualDom.mutation)
                addUnique(mutations, virtualDom.mutation);
              return element.attributes[propertyName];
            },
            set: (v) => {
              if (v === element.attributes[propertyName]) return;
              element.attributes[propertyName] = v;
              changedProps[propertyName] = true;
              virtualDom.enqueue(mutations);
            },
          });
      }
    }
    if (context?.safe?.error)
      Object.defineProperty(component, "error", {
        configurable: false,
        enumerable: true,
        get: () => context.safe.error,
      });

    const mutation = new Mutation(`##${componentMutationCount++}`, () =>
      component.render()
    );

    if (element.Component === Suspense) {
      const fragment = {
        type: "Fragment",
        node: virtualDom.createElement("fragment"),
        children: [],
      };
      virtualDom.suspense = component;
      const replaceChildren = () => {
        for (let i = 0, len = element.children.length; i < len; i++) {
          if (!element.children[i]) continue;
          removeElement(element.children[i]);
          traverseVirtualTree(
            element.children[i],
            (element) =>
              element.type === Component.Node && component?.onDisconnect?.()
          );
        }
        element.children = fragment.children;
        for (let i = 0, len = element.children.length; i < len; i++)
          element.children[i].parent = element;
        const referenceNode = findReferenceNode(
          parent,
          parent.children.indexOf(element)
        );
        while (fragment.node.firstChild)
          appendElement(
            element,
            { node: fragment.node.firstChild },
            referenceNode
          );
      };
      const result = mutation();
      if (element instanceof Promise)
        throw new VirtualDomError("Suspense render cannot be async");
      renderElementChildren(
        virtualDom,
        fragment,
        ensureArray(result),
        context,
        referenceNode
      );
      virtualDom.suspense = null;
      element.mutation = applyMutation(
        virtualDom,
        element,
        mutation,
        () => updateElement(virtualDom, element, null, ensureArray(mutation())),
        () =>
          component.fulfilled
            ? replaceChildren()
            : renderElementChildren(
                virtualDom,
                element,
                ensureArray(component.render(replaceChildren)),
                context,
                referenceNode
              )
      );
    } else
      element.mutation = applyMutation(
        virtualDom,
        element,
        mutation,
        evalMutation(mutation, (value) =>
          updateElement(virtualDom, element, null, ensureArray(value))
        ),
        evalMutationAsync(virtualDom, mutation, (value) =>
          renderElementChildren(
            virtualDom,
            element,
            ensureArray(value),
            context,
            referenceNode
          )
        )
      );

    if (!window.isServer && component.onConnect)
      preventMutation(virtualDom, () => component.onConnect?.());
    element.component = component;
    return element;
  }

  throw new VirtualDomError("Unknown Element type");
}

function updateElement(virtualDom, element, props, children) {
  const context = element.context;
  if (element.type === TextNode) {
    if (children[0] !== element.node.textContent)
      element.node.textContent = children[0];
    return element;
  }

  if (element.type === Component.Node) {
    let updateChildren = false;
    const keys = Object.keys(props || {});
    for (let i = 0, len = keys.length; i < len; i++) {
      if (!(props[keys[i]] instanceof Mutation)) continue;
      const mutations = element.props[keys[i]].context.mutations;
      applyMutation(
        virtualDom,
        element,
        element.props[keys[i]],
        evalMutation(props[keys[i]], (value) => {
          element.attributes[keys[i]] = value;
          virtualDom.enqueue(mutations);
        }),
        evalMutationAsync(virtualDom, props[keys[i]], (value) => {
          if (value === element.attributes[keys[i]]) return;
          element.attributes[keys[i]] = value;
          updateChildren = true;
        })
      );
    }
    if (updateChildren) children = ensureArray(element.mutation());
  } else if (element.type !== Fragment) {
    const keys = Object.keys(props || {});
    const disabledOrReadOnly =
      getPropValue(element.props.disabled) ||
      getPropValue(element.props.readOnly);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (!(props[keys[i]] instanceof Mutation)) continue;
      applyMutation(
        virtualDom,
        element,
        element.props[keys[i]],
        evalMutation(props[keys[i]], (value) =>
          virtualDom.setAttribute(
            element,
            keys[i],
            value,
            getPropValue(element.props.disabled) ||
              getPropValue(element.props.readOnly)
          )
        ),
        evalMutationAsync(virtualDom, props[keys[i]], (value) => {
          if (value === element.attributes[keys[i]]) return;
          virtualDom.setAttribute(element, keys[i], value, disabledOrReadOnly);
        })
      );
    }
  }

  if (children) {
    for (let i = 0, len = element.children.length; i < len; i++) {
      if (!element.children[i]) continue;
      removeElement(element.children[i]);
      traverseVirtualTree(
        element.children[i],
        (element) =>
          element.type === Component.Node && element.component?.onDisconnect?.()
      );
    }

    element.children = [];
    for (let i = 0, len = children.length; i < len; i++) {
      element.children[i] = renderElement(
        virtualDom,
        element,
        children[i],
        {
          ...context,
          components: [...context.components],
          depth: context.depth + 1,
        },
        findReferenceNode(element, i)
      );
    }
  } else {
    for (let i = 0, len = element.children.length; i < len; i++) {
      if (!element.children[i]) continue;
      const type = element.children[i].type;
      if (type === Fragment && element.children[i].mutation)
        element.children[i] = updateElement(
          virtualDom,
          element.children[i],
          null,
          ensureArray(element.children[i].mutation())
        );
      else if (type === Component.Node)
        element.children[i] = updateElement(virtualDom, element.children[i]);
      else
        element.children[i] = updateElement(
          virtualDom,
          element.children[i],
          element.children[i].props,
          element.children[i].children
        );
    }
  }

  return element;
}

function renderElementChildren(
  virtualDom,
  element,
  children,
  context,
  referenceNode
) {
  element.children = [];
  for (let i = 0, len = children.length; i < len; i++)
    element.children[i] = renderElement(
      virtualDom,
      element,
      children[i],
      {
        ...context,
        components: [...context.components],
        depth: context.depth + 1,
      },
      referenceNode
    );
}

function applyMutation(virtualDom, element, mutation, update, init) {
  const updateWrapper = () => {
    const components = element.context.components;
    for (let i = 0, len = components.length; i < len; i++)
      addUnique(virtualDom.affectedComponents, components[i]);
    update();
  };
  const safe = element?.context?.safe;
  if (element?.context?.profiler)
    mutation.update = element.context.profiler.record(
      safe ? safe.catch(updateWrapper) : updateWrapper,
      (profiler) => addUnique(virtualDom.profilers, profiler)
    );
  else mutation.update = safe ? safe.catch(updateWrapper) : updateWrapper;

  const previousMutation = virtualDom.mutation;
  virtualDom.mutation = mutation;
  if (safe) safe.catch(init)();
  else init();
  virtualDom.mutation = previousMutation;
  addUnique(element.mutations, mutation);
  return mutation;
}

function evalMutation(mutation, callback) {
  return () => {
    const result = mutation();
    if (result instanceof Promise) result.then(callback);
    else callback(result);
  };
}

function evalMutationAsync(virtualDom, mutation, callback) {
  return () => {
    const result = mutation();
    if (result instanceof Promise) {
      const suspense = virtualDom?.suspense?.register();
      if (!window.isServer)
        result.then(() => {
          virtualDom.enqueue([mutation]);
          suspense?.resolve?.();
        });
      callback(null);
    } else callback(result);
  };
}

function preventMutation(virtualDom, callback) {
  const previousMutation = virtualDom.mutation;
  virtualDom.mutation = null;
  callback();
  virtualDom.mutation = previousMutation;
}

function appendElement(parent, element, referenceNode) {
  if (parent.type === Fragment || parent.type === Component.Node) {
    if (referenceNode) {
      if (!parent.firstNode) parent.firstNode = element.node;
      else if (referenceNode === parent.firstNode)
        parent.firstNode = element.node;
      if (!parent.lastNode) parent.lastNode = element.node;
      else if (referenceNode.previousSibling === parent.lastNode)
        parent.lastNode = element.node;
      appendElement(parent.parent, element, referenceNode);
    } else {
      if (!parent.firstNode) parent.firstNode = element.node;
      parent.lastNode = element.node;
      appendElement(parent.parent, element);
    }
  } else if (referenceNode)
    parent.node.insertBefore(element.node, referenceNode);
  else parent.node.appendChild(element.node);
}

function removeElement(element) {
  const firstNode = element.node || element.firstNode;
  const remove = (parent, node) => {
    while (parent.type === Fragment || parent.type === Component.Node) {
      if (parent.firstNode === node) {
        if (parent.firstNode === parent.lastNode)
          (parent.firstNode = null), (parent.lastNode = null);
        else parent.firstNode = parent.firstNode.nextSibling;
      } else if (parent.lastNode === node)
        parent.lastNode = parent.lastNode.previousSibling;
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

function findReferenceNode(parent, index) {
  if (parent.type === VirtualDom || index == null) return null;
  const max = parent.children.length - 1;
  for (let i = 1, len = Math.max(index, max - index); i <= len; i++) {
    let cur = index + i;
    let child = cur <= max && parent.children[cur];
    if (child?.node) return child.node;
    if (child?.firstNode) return child.firstNode;
    cur = index - i;
    child = cur <= max && parent.children[cur];
    if (child?.node) return child.node.nextSibling;
    if (child?.lastNode) return child.lastNode.nextSibling;
  }
  if (parent.node || parent.parent.type === VirtualDom) return null;
  for (let i = 0, len = parent.parent?.children?.length || 0; i < len; i++) {
    if (parent.parent.children[i] === parent)
      return findReferenceNode(parent.parent, i);
  }
  return null;
}

function createPageSnapshot() {
  const snapshot = {};
  const activeElement = document.activeElement;
  if (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")
    snapshot.caret = {
      element: activeElement,
      position: activeElement.selectionStart || 0,
    };
  else {
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      const getElement = (element) => {
        if (element?.nodeType === Node.TEXT_NODE)
          return getElement(element.parentElement);
        if (element?.isContentEditable)
          return getElement(element.parentElement);
        return element;
      };
      const element = getElement(range.commonAncestorContainer);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      snapshot.caret = {
        element: element,
        position: preCaretRange.toString().length,
      };
    }
  }
  return snapshot;
}

function restorePageSnapshot(snapshot) {
  if (snapshot.caret) {
    const { element, position } = snapshot.caret;
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      element.focus();
      element.setSelectionRange(position, position);
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      let charCount = 0;
      (function traverseNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          let textLength = node.textContent.length;
          if (charCount + textLength >= position) {
            range.setStart(node, position - charCount);
            range.setEnd(node, position - charCount);
            return true;
          }
          charCount += textLength;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          for (let child of node.childNodes) {
            if (traverseNodes(child)) return true;
          }
        }
        return false;
      })(element);

      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

function traverseVirtualTree(element, callback) {
  if (!element) return;
  for (let i = 0, len = element?.children?.length || 0; i < len; i++)
    traverseVirtualTree(element.children[i], callback);
  callback(element);
}

function getPropValue(prop) {
  if (prop instanceof Mutation) return prop();
  return prop;
}
