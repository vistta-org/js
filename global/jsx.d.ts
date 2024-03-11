declare function createElement<Props extends { [name: string]: any }>(
  type: string | JSX.Component<Props>,
  props?: Props,
  children?: JSX.Node[],
): JSX.Element | null;
declare const Fragment: symbol;
declare const React: object;

interface Element {
  key?: string;
  ref?: any;
  scope?: string;
}

interface Event {
  strictMode: () => void;
}

interface SubmitEvent {
  values?: { [name: string]: any };
}

interface GlobalEventHandlers {
  validation: (target: Element) => string | boolean;
}

declare type HTMLProps<E extends HTMLElement | SVGElement> = Partial<
  {
    [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K];
  } & GlobalEventHandlers & { style?: Partial<CSSStyleDeclaration> }
>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;
  class Component<T extends { [name: string]: any }> {
    constructor(props?: T);
  }
  type Style = { scope: string };

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HTMLProps<HTMLElementTagNameMap[K]>;
  };

  interface IntrinsicElements extends IntrinsicElementMap {}
}
