export class Component<T = { [attr: string]: any }> {
  constructor(props: T);
  render(): JSX.Node;
}

export class Profiler extends Component<{
  id: string;
  callback: (id: string, performance: number) => void;
}> {}
export class Render extends Component<{ if: any } | { each: any }> {}
export class Scope extends Component<{ styles: JSX.Style[] }> {}
export class Suspense extends Component<{ fallback: JSX.Node }> {}
export class Try extends Component<{ fallback: JSX.Node }> {}
