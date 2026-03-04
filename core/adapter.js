(() => {
  if (typeof window !== "undefined") return;
  const globalRef = /** @type {any} */ (globalThis);
  globalRef.window = globalRef;
  const storage = { session: {}, local: {} };
  const readonly = { writable: false, configurable: false };
  Object.defineProperties(window, {
    isServer: { value: true, ...readonly },
    location: { value: { href: "" }, ...readonly },
    navigator: { value: { userAgent: "node.js" }, ...readonly },
    document: {
      value: {
        scripts: [],
        createDocumentFragment: () => createElement("fragment"),
        createTextNode: (text) => ({
          toString: () => "" + text,
          textContent: "" + text,
        }),
        createElement: (tag) => createElement(tag),
        documentElement: createElement("html"),
      },
      ...readonly,
    },
    HTMLElement: { value: class {}, ...readonly },
    CSSStyleSheet: {
      value: class {
        #value = [];
        get cssRules() {
          return this.#value;
        }
        insertRule(rule, index) {
          if (index === this.#value.length) this.#value.push(rule);
          else if (index == null || index < 0 || index > this.#value.length) this.#value.unshift(rule);
          else this.#value.splice(index, 0, rule);
          return index != null && index >= 0 && index < this.#value.length ? index : this.#value.length - 1;
        }
      },
      ...readonly,
    },
    MutationObserver: {
      value: class {
        constructor() {
          this.observe = () => null;
          this.disconnect = () => null;
        }
      },
      ...readonly,
    },
    IntersectionObserver: {
      value: class {
        constructor() {
          this.observe = () => null;
          this.unobserve = () => null;
          this.disconnect = () => null;
        }
      },
      ...readonly,
    },
    ResizeObserver: {
      value: class {
        constructor() {
          this.observe = () => null;
          this.unobserve = () => null;
          this.disconnect = () => null;
        }
      },
      ...readonly,
    },
    indexedDB: {
      value: {
        open: () => ({
          transaction: () => ({
            objectStore: () => ({
              get: () => ({
                onsuccess: () => null,
                onerror: () => null,
              }),
              put: () => ({
                onsuccess: () => null,
                onerror: () => null,
              }),
            }),
          }),
          onupgradeneeded: () => null,
          onsuccess: () => null,
          onerror: () => null,
        }),
      },
      ...readonly,
    },
    localStorage: {
      value: {
        setItem: (key, value) => (storage.local[key] = value),
        getItem: (key) => storage.local[key],
        removeItem: (key) => delete storage.local[key],
        clear: () => (storage.local = {}),
      },
      ...readonly,
    },
    sessionStorage: {
      value: {
        setItem: (key, value) => (storage.session[key] = value),
        getItem: (key) => storage.session[key],
        removeItem: (key) => delete storage.session[key],
        clear: () => (storage.session = {}),
      },
      ...readonly,
    },
    addEventListener: { value: () => null, ...readonly },
    removeEventListener: { value: () => null, ...readonly },
    requestAnimationFrame: { value: () => null, ...readonly },
    getComputedStyle: { value: () => new NodeCSSStyleDeclaration(), ...readonly },
  });
})();

function createElement(type) {
  const props = {
    style: {
      setProperty(key, value, priority) {
        this[key] = value + (priority?.toLowerCase() === "important" ? " !important" : "");
      },
    },
  };
  const children = [];
  return {
    type: type,
    style: props.style,
    children: children,
    childNodes: children,
    get outerHTML() {
      if (type == null || typeof type !== "string") return "";
      let attributes = "";
      const attr = Object.keys(props || {});
      for (let i = 0, len = attr.length; i < len; i++) {
        const name = attr[i];
        const value = name === "style" ? styleToString(props[name]) : props[name];
        if (value == null || value === false || ["function", "object"].includes(typeof value)) continue;
        if (value === true) attributes += ` ${name}`;
        else attributes += ` ${name}="${value}"`;
      }
      return `<${type}${attributes}>${this.innerHTML}</${type}>`;
    },
    get innerHTML() {
      return children?.reduce((acc, cur) => acc + cur, "");
    },
    toString() {
      return this.outerHTML;
    },
    appendChild: (child) => children.push(child),
    setAttribute: (name, value) => (props[name] = value),
    getAttribute: (name) => props[name],
    removeAttribute: (name) => delete props[name],
    addEventListener: () => null,
    replaceChildren: (...nodes) => {
      children.splice(0);
      for (let i = 0, len = nodes.length; i < len; i++) {
        const { type, children: _children } = nodes[i];
        if (type === "fragment") children.push(..._children);
        else children.push(nodes[i]);
      }
    },
    getBoundingClientRect: () => ({}),
  };
}

function styleToString(style) {
  if (typeof style !== "object" || style == null) return style;
  const keys = Object.keys(style || {});
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const value = style[keys[i]];
    if (typeof value === "string") result += ` ${keys[i].replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}: ${value};`;
  }
  result = result.trim();
  return result === "" ? null : result;
}

class NodeCSSStyleDeclaration {
  constructor() {
    this.cssText = "";
  }

  setProperty(property, value) {
    this[property] = value;
    this.cssText += `${property}: ${value}; `;
  }

  getPropertyValue(property) {
    return this[property];
  }

  removeProperty(property) {
    delete this[property];
    this.cssText = this.cssText.replace(new RegExp(`${property}: [^;]+;`), "");
  }
}
