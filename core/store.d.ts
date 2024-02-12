import { State } from "./tools";

type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type Action<T> = (prev: T, ...args: any[]) => T | Promise<T> | void;
type Partition<T, A extends { [index: string]: Action<T> }> = { readonly key: string } & State<T> & A;
type StoreCollection = { [key: string]: Partition<any, any> };
type StorePartition<P> =
  P extends Partition<infer E, infer A>
    ? Partition<
        E,
        {
          [K in keyof A]: P[K] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => Promise<E> : never;
        }
      >
    : never;
type StorePartitions<P, T extends (keyof P)[]> = {
  [K in keyof T]: StorePartition<P[T[K]]>;
};

export class Store<P extends StoreCollection> {
  constructor(partitions: P);
  static partition<T, M extends { [key: string]: Action<T> }>(
    initialState?: T,
    cache?: "none" | "session" | "storage",
    actions?: M,
    controllers?:
      | { [P in keyof M]: (status: string, controllerOrValue: any) => void }
      | ((partition: keyof M, status: string, controllerOrValue: any) => void),
  ): Partition<T, M>;
  get<T extends keyof P>(partition: T): StorePartition<P[T]>;
  get<T extends (keyof P)[]>(...partitions: T): StorePartitions<P, T>;
}
export interface Store<P extends StoreCollection> {
  <T extends keyof P>(partition: T): StorePartition<P[T]>;
  <T extends (keyof P)[]>(...partitions: T): StorePartitions<P, T>;
}
