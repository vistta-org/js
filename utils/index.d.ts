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

export type * from "./consts.d.ts";
export type * from "./date.d.ts";
export type * from "./fetch.d.ts";
export type * from "./object.d.ts";
export type * from "./string.d.ts";
