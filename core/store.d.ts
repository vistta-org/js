import { State } from "./classes";

type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type Action<T> = (prev: T, ...args: any[]) => T | Promise<T> | void;
type Partition<T, A extends { [index: string]: Action<T> }> = { readonly key: string } & State<T> & A;
type StoreCollection = { [key: string]: Partition<any, any> };
type UsePartition<P> =
  P extends Partition<infer E, infer A>
    ? Partition<
        E,
        {
          [K in keyof A]: P[K] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => Promise<E> : never;
        }
      >
    : never;

export class Store<P extends StoreCollection, T extends keyof P> {
  constructor(partitions: P);
  static partition<T, M extends { [key: string]: Action<T> }>(
    initialState?: T,
    cache?: "none" | "session" | "storage",
    actions?: M,
    controllers?:
      | { [P in keyof M]: (status: string, controllerOrValue: any) => void }
      | ((partition: keyof M, status: string, controllerOrValue: any) => void),
  ): Partition<T, M>;
  get(partition: T): UsePartition<P[T]>;
  get(...partitions: T[]): UsePartition<P[T]>[];
}
export interface Store<P extends StoreCollection, T extends keyof P> {
  (partition: T): UsePartition<P[T]>;
  (...partitions: T[]): UsePartition<P[T]>[];
}
