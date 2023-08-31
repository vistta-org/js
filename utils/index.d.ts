export function randomID(): string;

export function isEqual(a: any, b: any): boolean;

export function isPromise(target: any): boolean;

export function isAsync(target: any): boolean;

export function setImmediate(callback: () => void): void;

export function sleep(milliseconds: number): Promise<void>;

export function isServer(): boolean;

export function isBrowser(): boolean;

export type system = {
  register: (tagname: string, element: HTMLElement) => any;
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  import: (moduleName: string, options: { cache: boolean }) => any;
};

export * from "./consts";
export * from "./date";
export * from "./object";
export * from "./string";
