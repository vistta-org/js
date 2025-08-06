(() => {
  if (typeof window !== "undefined") return;
  global.window = global;
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
    getComputedStyle: { value: () => new CSSStyleDeclaration(), ...readonly },
  });
})();

function createElement(type) {
  const props = {
    style: {
      setProperty(key, value) {
        this[key] = value;
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
  const keys = Object.keys(style || {});
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const value = style[keys[i]];
    if (typeof value === "string") result += ` ${keys[i].replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}: ${value};`;
  }
  result = result.trim();
  return result === "" ? null : result;
}

class CSSStyleDeclaration {
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
