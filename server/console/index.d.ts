type Codes =
  | "reset"
  | "bright"
  | "dim"
  | "underscore"
  | "blink"
  | "reverse"
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white";

interface Console {
  code: { [K in Codes]: string };
  announce(...data: any[]): void;
  assert(condition?: boolean, ...data: any[]): void;
  clear(): void;
  count(key?: string): void;
  countReset(key?: string): void;
  print(...data: any[]): void;
  debug(...data: any[]): void;
  dir(item?: any, options?: any): void;
  dirxml(...data: any[]): void;
  error(...data: any[]): void;
  group(key?: string, ...data: any[]): void;
  groupCollapsed(key?: string, ...data: any[]): void;
  groupEnd(key?: string): void;
  info(...data: any[]): void;
  log(...data: any[]): void;
  onChange(callback: (logs: { type: string; message: string }[]) => void): void;
  sucess(...data: any[]): void;
  table(tabularData?: any, properties?: string[]): void;
  time(key: string): void;
  timeLog(key: string, ...data: any[]): void;
  timeEnd(key: string, print?: boolean): void;
  timeStamp(key: string): void;
  trace(...data: any[]): void;
  warn(...data: any[]): void;
}

// @ts-ignore
declare const console: Console;
