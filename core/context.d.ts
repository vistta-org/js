/*export declare const Context: new <
  T extends {
    [attr: string]: any;
  },
>(
  key: string,
  defaultValue?: T,
) => T;
*/
/*export class Context<T> {
  constructor(key: string, defaultValue?: T, cache?: "none" | "session" | "storage", actions, controllers);
}*/
type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type Action<T> = (prev: T, ...args: any[]) => T | Promise<T> | void;

export declare const Context: new <T, Actions extends { [key: string]: Action<T> }>(
  key: string,
  defaultValue?: T,
  cache?: "none" | "session" | "storage",
  actions?: Actions,
  controllers?:
    | { [K in keyof Actions]: (status: string, controllerOrValue: any) => void }
    | ((action: keyof Actions, status: string, controllerOrValue: any) => void),
) => {
  [K in keyof Actions]: Actions[K] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => Promise<T> : never;
} & { (): T };
