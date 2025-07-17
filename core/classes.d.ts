type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type Action<T> = (prev: T, ...args: any[]) => T | Promise<T> | void;

export declare const Fragment: Symbol;
export declare const TextNode: Symbol;

export declare const Element: new <Props extends { [name: string]: any }>(type: string, props?: Props, children?: JSX.Node) => JSX.Element;

export declare const Context: new <T, Actions extends { [key: string]: Action<T> }>(
  key: string,
  defaultValue?: T,
  cache?: "none" | "session" | "local" | "storage",
  actions?: Actions,
  controllers?:
    | { [K in keyof Actions]: (status: string, controllerOrValue: any) => void }
    | ((action: keyof Actions, status: string, controllerOrValue: any) => void),
) => {
  [K in keyof Actions]: Actions[K] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => Promise<void> : never;
} & { (): T };

export class Ref<T extends HTMLElement> {
  constructor(node?: T);
  node?: T;
}

export class Component extends JSX.Component {
  children?: JSX.Node | JSX.Node[];
}

export class ScopedFragment extends Component {
  style: JSX.Style;
}

export class Suspense extends Component {
  fallback: JSX.Node;
}

export class Profiler extends Component {
  callback: (performance: number) => void;
}

declare class RenderEach<T> extends Component {
  of: T[] | { [key: string]: T };
  as: (value: T, index: number | string) => JSX.Node;
}

export declare const Render: {
  If: typeof Component<{ condition: any }>;
  Each: typeof RenderEach;
};

export class Safe extends Component<{ fallback: JSX.Node }> {}

type FormRef = {
  node: HTMLFormElement;
  watch: (name: string | EventListener, listener?: EventListener) => void;
  unwatch: (name: string | EventListener, listener?: EventListener) => void;
  reset: (name?: string) => void;
  clear: (name?: string) => void;
  submit: () => void;
  values: () => { [name: string]: any };
  validate: (name?: string) => boolean;
};

export class Form extends Component<
  | {
      ref?: FormRef;
      className?: string;
      autocomplete?: boolean;
      onSubmit: (event: any) => any;
      onInvalid?: (event: any) => any;
      style?: Partial<CSSStyleDeclaration>;
    }
  | { name: string; className?: string; style?: Partial<CSSStyleDeclaration> }
> {
  static Ref: new () => FormRef;
}
