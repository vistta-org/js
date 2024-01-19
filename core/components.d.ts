export function Profiler(props: { id?: string; callback: (info: { id?: string; duration: number }) => void }): JSX.Node;
export function Suspense(props: { fallback: JSX.Node }): JSX.Node;
export function TryCatch(props: { fallback: JSX.Node }): JSX.Node;
export function Render(props: { if?: any } | { each: any }): JSX.Node;
export function Scope(props: { style: JSX.Style[] }): JSX.Node;
export function async<T>(Component: JSX.Component<T>): JSX.Component<T>;
