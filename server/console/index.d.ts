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

interface ConsoleResult {
  replace(...data: any[]): void;
  update(...data: any[]): void;
}

interface Console {
  code: { [K in Codes]: string };
  announce(...data: any[]): ConsoleResult;
  assert(condition?: boolean, ...data: any[]): void;
  clear(): void;
  count(key?: string): void;
  countReset(key?: string): void;
  print(...data: any[]): ConsoleResult;
  debug(...data: any[]): ConsoleResult;
  dir(item?: any, options?: any): ConsoleResult;
  dirxml(...data: any[]): ConsoleResult;
  error(...data: any[]): ConsoleResult;
  group(key?: string, ...data: any[]): void;
  groupCollapsed(key?: string, ...data: any[]): void;
  groupEnd(key?: string): void;
  info(...data: any[]): ConsoleResult;
  log(...data: any[]): ConsoleResult;
  onChange(callback: (logs: { type: string; message: string }[]) => void): void;
  sucess(...data: any[]): ConsoleResult;
  table(tabularData?: any, properties?: string[]): void;
  time(key: string): void;
  timeLog(key: string, ...data: any[]): void;
  timeEnd(key: string, print?: boolean): void;
  timeStamp(key: string): void;
  trace(...data: any[]): void;
  warn(...data: any[]): ConsoleResult;
}

// @ts-ignore
declare const console: Console;
