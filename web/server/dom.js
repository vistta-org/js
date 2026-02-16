import "../../core/adapter.js";
import { Component, Element } from "../../core/classes.js";
import { VirtualDom } from "../../core/dom.js";

class ServerVirtualDom extends VirtualDom {
  constructor(config) {
    super("body", document.createDocumentFragment(), config);
  }

  enqueue() {}

  next() {}

  replaceStyleSheets() {}
}

export { Component, Element, ServerVirtualDom as VirtualDom };
