export class Context<T> {
  constructor(key: string);
}
export function newContext<T>(key: string): Context<T>;

export class Ref<T> {
  constructor(initialValue: T);
  current?: T;
}
export function newRef<T = any>(initialValue?: T): Ref<T>;

export class State<T> {
  constructor(initialValue: T);
  set: (value: T | ((value: T) => T)) => void;
  valueOf: () => T;
  toString: () => string;
}
export interface State<T> {
  (): T;
  (callback?: (value: T) => any): any;
}
export function newState<T = any>(initialValue?: T): State<T>;

export class Effect {
  constructor(callback: () => void | (() => void), dependencies?: any[], runOnRender?: boolean);
}
export function newEffect(callback: () => void | (() => void), dependencies?: any[], runOnRender?: boolean): void;

type EventListener = (event?: any) => void;
export class Form {
  constructor();
  watch: (name: string | EventListener, listener?: EventListener) => void;
  reset: (name?: string) => void;
  clear: (name?: string) => void;
  submit: () => void;
  values: () => { [name: string]: any };
}
export interface Form {
  (props: HTMLProps<HTMLFormElement>): JSX.Node;
}
export function newForm(): Form;
