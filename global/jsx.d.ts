declare function createElement(type: any, props?: { [name: string]: any }, children?: JSX.Node[]): JSX.Element | null;
declare const Fragment: symbol;
declare const React: object;

interface State<T> {
  (): T;
  (callback?: (value: T) => any): any;
}

interface Element {
  key?: string;
  ref?: any;
  scope?: string;
  style?: any;
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
    [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K] | State<E[K]>;
  } & GlobalEventHandlers
>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;
  type Component<T = { [attr: string]: any }> = (props: T & { children?: JSX.Node }) => Element | Element[] | null;
  type Style = { scope: string };

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HTMLProps<HTMLElementTagNameMap[K]>;
  };

  interface IntrinsicElements extends IntrinsicElementMap {}
}
