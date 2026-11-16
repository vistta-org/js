/// <reference types="./global.d.ts" />

declare module "./core/classes.js" {
  interface Component<Props extends Record<string, any> = Record<string, any>> extends Props {
    props(...exclude: string[]): Partial<Props & Record<string, any>>;
  }
}

export type ContextActions<Value extends Record<string, any>> = Record<
  string,
  (prev: Value, ...args: any[]) => Value | Promise<Value>
>;

export type ContextActionMethods<Actions extends Record<string, (...args: any[]) => any>> = {
  [K in keyof Actions]: Actions[K] extends (prev: any, ...rest: infer Rest) => any
    ? (...args: Rest) => Promise<void> & { abort: (...args: any[]) => void }
    : () => Promise<void> & { abort: (...args: any[]) => void };
};

export type ContextProxyListener = {
  get?: (path: string, value: any) => void;
  set?: (path: string, value: any) => void;
};

export type ContextActionStatus = "pending" | "completed" | "rejected";

/**
 * A callable reactive unit. `prop()`/`child()` create renderer-internal DOM
 * mutations; `new Mutation(factory, ...args)` creates a cached reactive value
 * re-derived when an input changes or `.update()` is called.
 */
export interface Mutation<Value = any> {
  /**
   * Evaluates the mutation: returns the cached value (recomputing when
   * dirty), applying call arguments to a function-valued result.
   */
  (...callArgs: any[]): Value;
  /**
   * Re-derives the value, optionally replacing its inputs. A bare call
   * refreshes with the current inputs.
   */
  update(...args: any[]): void;
}

export interface MutationConstructor {
  /**
   * The mutation currently capturing reactive reads.
   */
  current: Mutation | null;
  /**
   * Creates a standalone reactive value derived from explicit inputs.
   *
   * @param factory - Derives the value from the given inputs.
   * @param args - Initial inputs, replaceable via `.update(...)`.
   */
  new <Value = any>(factory: (...args: any[]) => Value, ...args: any[]): Mutation<Value>;
}

export const Mutation: MutationConstructor;

export interface Context<
  Value extends Record<string, any> = Record<string, any>,
  Actions extends ContextActions<Value> = ContextActions<Value>,
> extends ContextActionMethods<Actions> {
  (): Value;
  readonly key: string;
  readonly value: Value;
  valueOf(): Value;
  toString(): string;
  proxy(listener?: ContextProxyListener): Value;
  on(event: "change", callback: (prev: Value, next: Value) => void): () => void;
  on(event: keyof Actions & string, callback: (status: ContextActionStatus, value: Value) => void): () => void;
}

export interface ContextConstructor {
  readonly id: symbol;
  new <Value extends Record<string, any>, Actions extends ContextActions<Value> = ContextActions<Value>>(
    key: string,
    value: Value,
    options?: {
      cache?: "none" | "session" | "local" | "storage";
      actions?: Actions;
      encode?: boolean;
      sync?: boolean;
    },
  ): Context<Value, Actions> & ContextActionMethods<Actions>;
}

export const Context: ContextConstructor;

export type AnchorPlacement = "bottom" | "top" | "left" | "right";

export interface AnchorPositionOptions {
  gap?: number | string;
  fallback?: string | string[] | false;
  minSize?: boolean;
}

export interface Anchor {
  node?: Element;
  readonly name: string;
  (target: Element): void;
  (target: AnchorPlacement, options?: AnchorPositionOptions): Record<string, string>;
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
  to(anchor: Anchor | string, target: AnchorPlacement, options?: AnchorPositionOptions): Record<string, string>;
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

export interface HistoryContext<
  Value extends Record<string, any> = Record<string, any>,
  Actions extends Record<string, (...args: any[]) => any> = {},
> extends Context<Value, ContextActions<Value>> {
  onUpdate(listener: (prev: Value, next: Value) => void): () => void;
}

export interface HistoryContextConstructor {
  new <Value extends Record<string, any>, Actions extends Record<string, (...args: any[]) => any> = {}>(
    name: string,
    initial: Value,
    options?: {
      cache?: "none" | "session" | "local" | "storage";
      actions?: Actions;
    },
  ): HistoryContext<Value, Actions> &
    ContextActionMethods<
      Actions & {
        set: (prev: Value, state: Value) => Value | Promise<Value>;
        update: (prev: Value, state: Partial<Value> & Record<string, any>) => Value | Promise<Value>;
      }
    >;
}

export const HistoryContext: HistoryContextConstructor;

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
  VirtualContainer,
} from "./core/classes.js";
export { requestNextMutation } from "./core/dom.js";
export {
  Anchor,
  Clipboard,
  File,
  Haptics,
  HistoryContext,
  Notification,
  Scheduler,
  Style,
  ThemeContext,
} from "./core/utils/index.js";
export { COPY, default as Controller, DELETE, GET, MOVE, PATCH, POST, PUT, REST } from "./server/controller.js";
export { default as Router } from "./server/router.js";
export { default as Socket } from "./server/socket.js";
export const Worker: ServiceWorkerRegistration;
