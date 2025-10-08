import "../../core/adapter.js";
import { Component, Element } from "../../core/classes.js";
import { VirtualDom } from "../../core/dom.js";
import { RESOURCES_PATH } from "../../utils/index.js";

class ServerVirtualDom extends VirtualDom {
  constructor(config) {
    super("server", document.createDocumentFragment(), config);
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

export { Component, Element, renderToString };
