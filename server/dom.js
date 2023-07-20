import Dom, { createElement } from "../core/dom";
import { camelCaseToKebabCase, system } from "../utils";

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
  const props = { style: {} };
  const children = [];
  return {
    type: type,
    style: props.style,
    children: children,
    toString: () => {
      const _children = children?.reduce((acc, cur) => acc + cur, "");
      return type === "dom" ? _children : `<${type}${propsToString(props)}>${_children}</${type}>`;
    },
    append: (child) => children.push(child),
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

function propsToString(props) {
  let result = "";
  const attr = Object.keys(props || {});
  for (let i = 0, len = attr.length; i < len; i++) {
    const name = attr[i];
    const value = name === "style" ? styleToString(props[name]) : props[name];
    if (["function", "object"].includes(typeof value) || value == null) continue;
    if (value === true) result += ` ${name}`;
    else result += ` ${name}="${value}"`;
  }
  return result;
}

function styleToString(style) {
  const keys = Object.keys(style || {});
  if (!keys.length) return null;
  let result = "";
  for (let i = 0, len = keys.length; i < len; i++) {
    const name = keys[i];
    result += ` ${camelCaseToKebabCase(name)}: ${style[name]};`;
  }
  return result.trim();
}
