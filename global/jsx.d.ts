declare function createElement(type: any, props?: { [name: string]: any }, children?: JSX.Node[]): JSX.Element | null;

declare const Fragment: symbol;
declare const React: object;

type HtmlProps<E extends HTMLElement | SVGElement> = Partial<
  {
    [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K];
  } & { children?: JSX.Node }
>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;

  interface IntrinsicElements extends IntrinsicElementMap {}

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HtmlProps<HTMLElementTagNameMap[K]>;
  };
}
