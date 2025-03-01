import "./adapter.js";
import { VirtualDom } from "../../core/dom.js";
import { Element } from "../../core/classes.js";
import { RESOURCES_PATH } from "../../utils/index.js";

document.createDocumentFragment = () => createServerElement("fragment");
document.createTextNode = (text) => ({ toString: () => "" + text });
document.createElement = (tag) => createServerElement(tag);

class ServerVirtualDom extends VirtualDom {
  constructor() {
    super("server", createServerElement("dom"));
  }

  enqueue() {}

  next() {}

  addStyleSheet(style, scoped) {
    style = `/${RESOURCES_PATH}/${style}${scoped ? ".scoped" : ""}.css`;
    for (let i = 0, len = window.page.styleSheets.length; i < len; i++) {
      if (window.page.styleSheets[i] === style) return;
    }
    window.page.styleSheets.push(style);
  }
}

function renderToString(element) {
  const virtualDom = new ServerVirtualDom();
  virtualDom.render(element);
  return virtualDom.host.toString();
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
