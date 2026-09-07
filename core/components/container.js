import { Component } from "../component.js";
import { Element } from "../element.js";
import { createDomMutation } from "../mutation.js";
import { spreadProps } from "../props.js";
import { Ref } from "../ref.js";

/**
 * @typedef {{
 *   id?: string,
 *   ref?: Ref<HTMLElement> | ((element: HTMLElement) => void),
 *   style?: JSX.Style,
 * }} VirtualContainerBaseProps
 *
 * @typedef {VirtualContainerBaseProps & {
 *   type: "scroll",
 *   rowCount?: number,
 *   rows?: ((index: number) => JSX.Element) | JSX.Element[],
 *   rowHeight?: number,
 *   overscan?: number,
 *   scrollTop?: number,
 * }} VirtualContainerScrollProps
 *
 * @typedef {VirtualContainerBaseProps & {
 *   type?: "lazy",
 * }} VirtualContainerLazyProps
 *
 * @typedef {JSX.EventHandlers & (VirtualContainerScrollProps | VirtualContainerLazyProps)} VirtualContainerProps
 */
const VIRTUAL_CONTAINER_HANDLED_PROPS = ["visible", "ref", "type", "rows", "rowHeight", "rowCount", "overscan"];
/**
 * A virtual container that supports two modes:
 * - **Virtual scroll**: when `rows` and `rowHeight` are provided, renders only the visible rows.
 * - **Lazy render**: when only children are provided, renders them only when the container is visible in the viewport.
 * @extends {Component<VirtualContainerProps>}
 */
export class VirtualContainer extends Component {
  visible;
  #container = new Ref();
  #inner = new Ref();
  #observer;
  #start = 0;
  #end = 0;
  #prevRows;
  #prevRowCount;

  onConnect() {
    const container = this.#container.node;
    if (!container) return;
    if (this.type === "scroll") {
      this.#update();
      this.#observer = new ResizeObserver(() => this.#update());
      container.style.setProperty("overflow", "auto", "important");
    } else
      this.#observer = new IntersectionObserver(([entry]) => (this.visible = entry.isIntersecting), {
        rootMargin: "100px",
      });
    this.#observer.observe(container);
  }

  onDisconnect() {
    this.#observer?.disconnect();
  }

  #update() {
    const container = this.#container.node;
    if (!container) return;
    // @ts-ignore
    const rows = this.rows;
    // @ts-ignore
    const count = Array.isArray(rows) ? rows.length : this.rowCount;
    const rowsChanged = rows !== this.#prevRows || count !== this.#prevRowCount;
    this.#prevRows = rows;
    this.#prevRowCount = count;
    // @ts-ignore
    const start = Math.max(0, ((container.scrollTop / this.rowHeight) | 0) - (this.overscan || 10));
    const end = Math.min(
      count,
      // @ts-ignore
      (((container.scrollTop + container.clientHeight) / this.rowHeight) | 0) + 1 + (this.overscan || 10),
    );
    if (!rowsChanged && start === this.#start && end === this.#end) return;
    this.#start = start;
    this.#end = end;
    const inner = this.#inner.node;
    if (inner) {
      // @ts-ignore
      inner.style.setProperty("height", `${count * this.rowHeight}px`, "important");
      inner.style.setProperty("box-sizing", "border-box", "important");
      // @ts-ignore
      inner.style.setProperty("padding", `${start * this.rowHeight}px 0 ${(count - end) * this.rowHeight}px`, "important");
    }
    const visible = [];
    if (typeof rows === "function") {
      for (let i = start; i < end; i++) visible.push(rows(i));
    } else if (Array.isArray(rows)) {
      for (let i = start; i < end; i++) visible.push(rows[i]);
    }
    this.visible = visible;
  }

  render() {
    if (this.type === "scroll")
      return new Element(
        "div",
        {
          ref: Ref.forward(this.ref, this.#container),
          ...spreadProps(() => this.props(...VIRTUAL_CONTAINER_HANDLED_PROPS)),
          onScroll: (e) => (this.#update(), this.onScroll?.(e)),
        },
        new Element(
          "div",
          {
            ref: this.#inner,
          },
          createDomMutation(() => (this.#update(), this.visible)),
        ),
      );

    return new Element(
      "div",
      {
        ref: Ref.forward(this.ref, this.#container),
        ...spreadProps(() => this.props(...VIRTUAL_CONTAINER_HANDLED_PROPS)),
      },
      createDomMutation(() => this.visible && this.children),
    );
  }
}
