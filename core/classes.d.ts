export class Ref<T> {
  constructor(initialValue: T);
  current?: T;
}

export class Component<T = {}> extends JSX.Component<T> {}

export class Suspense extends Component<{ fallback: JSX.Node }> {}

export class Profiler extends Component<{
  callback: (performance: number) => void;
}> {}

declare class RenderEach<T> extends Component<{
  target: T[] | { [key: string]: T };
  callback: (value: T, index: number | string) => JSX.Node;
}> {}

export declare const Render: {
  If: typeof Component<{ condition: any }>;
  Each: typeof RenderEach;
};

export class Try extends Component<{ fallback: JSX.Node }> {}
