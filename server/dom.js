import Dom, { createElement } from "../core/dom";
import { system } from "../utils";

system.set("MutationObserver", class {});
system.set("IntersectionObserver", class {});
system.set("ResizeObserver", class {});

class ServerDom extends Dom {
  body = createServerElement("dom");
  style = { styleSheet: {} };

  constructor() {
    super(false);
  }

  createDocumentFragment = () => createServerElement("fragment");
  createTextNode = (text) => ({ toString: () => "" + text });
  createElement = (tag) => createServerElement(tag);
}

function renderToString(element) {
  const dom = new ServerDom();
  dom.render(element);
  if (system.get("route")?.style) system.get("route").style += dom.style?.styleSheet?.cssText || "";
  return dom.body.toString();
}

export { renderToString, createElement };

//

function createServerElement(type) {
  const self = {
    props: { style: {} },
    children: [],
  };
  //console.log()
  return {
    type: type,
    style: self.props.style,
    children: self.children,
    toString: () => {
      const children = self.children?.reduce((acc, cur) => acc + cur, "");
      return type === "dom" ? children : `<${type}${propsToString(self.props)}>${children}</${type}>`;
    },
    append: (child) => self.children.push(child),
    setAttribute: (name, value) => (self.props[name] = value),
    removeAttribute: (name) => delete self.props[name],
    addEventListener: () => null,
    replaceChildren: (...nodes) => {
      self.children = [];
      for (let i = 0, len = nodes.length; i < len; i++) {
        const { type, children } = nodes[i];
        if (type === "fragment") self.children.push(...children);
        else self.children.push(nodes[i]);
      }
    },
  };
}

function propsToString(props) {
  let result = "";
  Object.entries(props || {}).forEach(([prop, value]) => {
    if (["function", "object"].includes(typeof value) || value == null) return;
    result += ` ${prop}="${value}"`;
  });
  return result;
}
