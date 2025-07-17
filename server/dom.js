import { Element } from "../core/classes.js";
import "../core/dom/adapter.js";
import { VirtualDom } from "../core/dom/index.js";
import { RESOURCES_PATH } from "../utils/index.js";

class ServerVirtualDom extends VirtualDom {
  constructor() {
    super("server", document.createDocumentFragment());
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
  return virtualDom.host.innerHTML;
}

export { Element, renderToString };
