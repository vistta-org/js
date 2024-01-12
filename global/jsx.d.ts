declare function createElement(type: any, props?: { [name: string]: any }, children?: JSX.Node[]): JSX.Element | null;
declare const Fragment: symbol;
declare const React: object;

interface State<T> {
  (): T;
  (callback?: (value: T) => any): any;
}

interface Event {
  strictMode: () => void;
}

interface Element {
  children?: JSX.Node;
}

type HtmlProps<E extends HTMLElement | SVGElement> = Partial<
  {
    [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K] | State<E[K]>;
  } & GlobalEventHandlers
>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;
  type Component<T = { [attr: string]: any }> = (props: T) => Element | Element[] | null;
  type Style = { id: string; raw: string; hash: string; path: string };

  interface IntrinsicElements extends IntrinsicElementMap {}

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HtmlProps<HTMLElementTagNameMap[K]>;
  };
}
