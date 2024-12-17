import "./adapter.js";
import Dom from "../../core/dom.js";
import { Element } from "../../core/classes.js";

class ServerDom extends Dom {
  constructor() {
    super("", createServerElement("dom"));
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

export { renderToString, Element };

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
    childNodes: children,
    toString: () => {
      const _children = children?.reduce((acc, cur) => acc + cur, "");
      return type === "dom"
        ? _children
        : new Element(type, props, _children).toString();
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
  };
}
