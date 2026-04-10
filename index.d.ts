/// <reference types="./global.d.ts" />

declare module "./core/classes.js" {
  interface Component<Props extends Record<string, any> = Record<string, any>> extends Props {}
}

import { AnchorKey } from "./core/utils.js";

export type ContextActions<Value extends Record<string, any>> = Record<
  string,
  (prev: Value, ...args: any[]) => Value | Promise<Value>
>;

export type ContextActionMethods<Actions extends ContextActions<any>> = {
  [K in keyof Actions]: (
    ...args: Parameters<Actions[K]> extends [any, ...infer Rest] ? Rest : never
  ) => Promise<void> & { abort: (...args: any[]) => void };
};

export type ContextProxyListener = {
  get?: (path: string, value: any) => void;
  set?: (path: string, value: any) => void;
};

export interface Context<
  Value extends Record<string, any> = Record<string, any>,
  Actions extends ContextActions<Value> = ContextActions<Value>
> extends ContextActionMethods<Actions> {
  (): Value;
  readonly key: string;
  readonly value: Value;
  valueOf(): Value;
  toString(): string;
  proxy(listener?: ContextProxyListener): Value;
}

export interface ContextConstructor {
  readonly id: symbol;
  new <
    Value extends Record<string, any>,
    Actions extends ContextActions<Value> = ContextActions<Value>
  >(
    key: string,
    value: Value,
    cache?: "none" | "session" | "local" | "storage" ,
    actions?: Actions,
    controllers?:
      | ((target: keyof Actions & string, status: "pending" | "completed" | "rejected", value: Value) => void)
      | Partial<Record<keyof Actions & string, (status: "pending" | "completed" | "rejected", value: Value) => void>>,
  ): Context<Value, Actions> & ContextActionMethods<Actions>;
}

export const Context: ContextConstructor;

export interface Anchor {
  node?: Element;
  (target: Element): void;
  (target: AnchorKey, offset?: number | string): string;
  x: string;
  y: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
  width: string;
  height: string;
}

export interface AnchorConstructor {
  new (node?: Element): Anchor;
}

export const Anchor: AnchorConstructor;

export class ThemeContext extends Context<
  { value: string },
  {
    toggle: (prev: { value: string }) => { value: string } | Promise<{ value: string }>;
    set: (prev: { value: string }, value: string) => { value: string } | Promise<{ value: string }>;
  }
> {
  constructor();
}

export class HistoryContext<Value extends Record<string, any> = Record<string, any>> extends Context<
  Value,
  {
    set: (prev: Value, state: Record<string, any>) => Value | Promise<Value>;
    update: (prev: Value, state: Record<string, any>) => Value | Promise<Value>;
  }
> {
  constructor(name: string, initial: Value, cache?: "none" | "session" | "local" | "storage");
  onUpdate(listener: (prev: Value, next: Value) => void): void;
}

export {
  Component,
  Element,
  Form,
  Fragment,
  Profiler,
  Ref,
  Render,
  Safe,
  Suspense,
} from "./core/classes.js";

export { Style, File } from "./core/utils.js";
export { default as router } from "./web/client/router.js";
export { default as socket } from "./core/socket.js";
export { default as Controller, COPY, DELETE, GET, MOVE, PATCH, POST, PUT, REST } from "./web/server/controller.js";
export { worker } from "./index.js";
