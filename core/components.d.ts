export declare const Component: new <
  T extends {
    [attr: string]: any;
  },
>(
  props: T,
) => T;

export class Profiler extends Component<{
  id: string;
  callback: (id: string, performance: number) => void;
}> {}

declare class RenderEach<T> extends Component<{
  in: T[] | { [key: string]: T } | State<T[]> | State<{ [key: string]: T }>;
  callback: (value: T, index: number | string) => JSX.Node;
}> {}

export declare const Render: {
  If: typeof Component<{ condition: any }>;
  Each: typeof RenderEach;
};

export class Suspense extends Component<{ fallback: JSX.Node }> {}

export class Try extends Component<{ fallback: JSX.Node }> {}
