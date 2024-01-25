export class Component<T = { [attr: string]: any }> {
  constructor(props: T);
  render(): JSX.Node;
}

export class Profiler extends Component<{
  id: string;
  callback: (id: string, performance: number) => void;
  children: JSX.Node;
}> {}
export class Render extends Component<{ if: any; children: JSX.Node } | { each: any; children: JSX.Node }> {}
export class Scope extends Component<{ styles: JSX.Style[]; children: JSX.Node }> {}
export class Suspense extends Component<{ fallback: JSX.Node; children: JSX.Node }> {}
export class Try extends Component<{ fallback: JSX.Node; children: JSX.Node }> {}
