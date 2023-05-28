import { State } from "./hooks";

interface Partition<T> extends State<T> {
  readonly key: string;
  readonly value: any;
  actions: (() => void)[];
}
export class Store {
  constructor(partitions: Partition<any>[]);
  static createPartition(key: string, config: any): Partition<any>;
  static createAction(name: string, action: (...args: any) => void, on: (event: string, value: any) => void);
}

export function useStore(a: any, b: any): any;
