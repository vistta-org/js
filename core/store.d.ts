import { State } from "./hooks";

type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type Action<T> = (prev: T, ...args: any[]) => T | Promise<T> | void;
type Partition<T, A extends { [index: string]: Action<T> }> = { readonly key: string } & State<T> & A;
type StoreCollection = { [key: string]: Partition<any, any> };
type UsePartition<P> = P extends Partition<infer E, infer A>
  ? Partition<
      E,
      {
        [K in keyof A]: P[K] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => Promise<E> : never;
      }
    >
  : never;

export class Store {
  static createPartition<T, M extends { [key: string]: Action<T> }>(
    key: string,
    initialState?: T,
    cache?: "none" | "session" | "storage",
    actions?: M,
    controllers?:
      | { [P in keyof M]: (status: string, controllerOrValue: any) => void }
      | ((partition: keyof M, status: string, controllerOrValue: any) => void),
  ): Partition<T, M>;
  static use<P extends StoreCollection, T extends keyof P>(partition: T): UsePartition<P[T]>;
  static use<P extends StoreCollection, T extends keyof P>(...partitions: T[]): UsePartition<P[T]>[];
}
