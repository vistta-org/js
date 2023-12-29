export function useContext<T = any>(key?: string): T;

export function useStyle(...styles: JSX.Style[]): JSX.Component | { scope: string };

export class Ref<T> {
  constructor(value: T);
  current?: T;
}
export function useRef<T = any>(initialValue?: T): Ref<T>;

export class State<T> {
  constructor(value: T);
  set: (value: T | ((value: T) => T)) => void;
  valueOf: () => T;
  toString: () => string;
}
export interface State<T> {
  (): T;
  (callback?: (value: T) => any): any;
}
export function useState<T = any>(initialValue?: T): State<T>;

export function useEffect(callback: () => void | (() => void), dependencies?: any[], runOnRender?: boolean): void;

type EventListener = (event?: any) => void;
export function useForm(onSubmit: (event: any) => void): {
  (props: { children?: JSX.Node; id?: string; className?: string; style?: { [key: string]: string } }): JSX.Node;
  watch: (name: string | EventListener, listener?: EventListener) => void;
  reset: (name?: string) => void;
  clear: (name?: string) => void;
  submit: () => void;
  values: () => { [name: string]: any };
};
