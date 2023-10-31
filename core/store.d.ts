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

export class Store {
  constructor(partitions: Partition<any>[]);
  static createPartition<T>(config: PartitionConfig<T>): Partition<T>;
  static createAction(
    name: PartitionAction["name"],
    action: PartitionAction["action"],
    on?: PartitionAction["on"],
  ): PartitionAction;
  use<T>(partition: string): Partition<T>;
}

export function useStore<T>(partition: string): Partition<T>;
