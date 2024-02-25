export function isBrowser(): boolean;
export function apply<T = { [key: string]: any }>(applier: "combine" | "assign" | ((a: T, b: T) => T), ...props: T[]): T;
export function apply<T = { [key: string]: any }>(...props: T[]): T;
