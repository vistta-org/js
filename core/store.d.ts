import { State } from "./hooks";

declare class Partition<T> extends State<T> {
  private key: string;
  private value: any;
}

type PartitionConfig<T> = {
  key: string;
  initialState?: T;
  cache?: "none" | "session" | "storage";
  actions: PartitionAction[];
};

type PartitionAction = {
  name: string;
  action: (...args: any) => void;
  on?: (event: string, value: any) => void;
};

export class Store<P> {
  constructor(partitions: Partition<any>[]);
  static createPartition<T>(config: PartitionConfig<T>): Partition<T>;
  static createAction(
    name: PartitionAction["name"],
    action: PartitionAction["action"],
    on?: PartitionAction["on"],
  ): PartitionAction;
  use<T extends keyof P>(partition: string): Partition<P[T]>;
  use<T extends keyof P>(...partitions: string[]): Partition<P[T]>[];
}
export interface Store<P> {
  <T extends keyof P>(partition: string): Partition<P[T]>;
  <T extends keyof P>(...partitions: string[]): Partition<P[T]>[];
}
