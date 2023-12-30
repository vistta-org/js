import { State } from "./hooks";

type Action<T = any> = (prev: T, ...args: any[]) => T | Promise<T> | void;

declare class PartitionState<T = any> extends State<T> {
  private key: string;
  private value: any;
}

type Partition<T, M extends { [index: string]: Action<T> }> = PartitionState<T> & M;

type DropFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never;
type UsePartition<T> = {
  [P in keyof T]: T[P] extends (...args: infer A) => infer R ? (...args: DropFirst<A>) => void : never;
};
type StoreCollection = { [key: string]: Partition<any, any> };
//
export class Store<P extends StoreCollection> {
  constructor(partitions: Partition<any, any>[]);
  static createPartition<T, M extends { [key: string]: Action<T> }>(
    key: string,
    initialState?: T,
    cache?: "none" | "session" | "storage",
    actions?: M,
    controllers?:
      | { [P in keyof M]: (status: string, controllerOrValue: any) => void }
      | ((partition: keyof M, status: string, controllerOrValue: any) => void),
  ): Partition<T, M>;
  use<T extends keyof P>(partition: keyof P): UsePartition<P[T]>;
  use<T extends keyof P>(...partitions: (keyof P)[]): UsePartition<P[T]>[];
}

export interface Store<P extends StoreCollection> {
  <T extends keyof P>(partition: keyof P): UsePartition<P[T]>;
  <T extends keyof P>(...partitions: (keyof P)[]): UsePartition<P[T]>[];
}
