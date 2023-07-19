export function Profiler(props: {
  id?: string;
  children: JSX.Node;
  callback: (info: { id?: string; duration: number }) => void;
}): JSX.Node;
export function Suspense(props: { children: JSX.Node; fallback: JSX.Node }): JSX.Node;
//export function Render(props: { children: JSX.Node }): JSX.Node;
export function TryCatch(props: { children: JSX.Node; fallback: JSX.Node }): JSX.Node;

export function async<T>(Component: JSX.Component<T>): JSX.Component<T>;
export function context<T>(Component: JSX.Component<T>, context: { [key: string]: any }): JSX.Component<T>;
