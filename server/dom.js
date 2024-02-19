import Dom from "../core/dom";
import { createElement, createElementString } from "../core/element";
import { system } from "../utils";

system.set("MutationObserver", class { });
system.set("IntersectionObserver", class { });
system.set("ResizeObserver", class { });

class ServerDom extends Dom {
  node = createServerElement("dom");

  constructor() {
    super("", false);
  }

  createDocumentFragment = () => createServerElement("fragment");
  createTextNode = (text) => ({ toString: () => "" + text });
  createElement = (tag) => createServerElement(tag);
}

function renderToString(element) {
  const dom = new ServerDom();
  dom.render(element);
  return dom.node.toString();
}

export { renderToString, createElement };

//

function createServerElement(type) {
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
    toString: () => {
      const _children = children?.reduce((acc, cur) => acc + cur, "");
      return type === "dom" ? _children : createElementString(type, props, _children);
    },
    append: (child) => children.push(child),
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
  };
}
