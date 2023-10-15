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

declare class Console {
  static reset: string;
  static bright: string;
  static dim: string;
  static underscore: string;
  static blink: string;
  static reverse: string;
  static black: string;
  static red: string;
  static green: string;
  static yellow: string;
  static blue: string;
  static magenta: string;
  static cyan: string;
  static white: string;

  constructor(id: string);
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
  group(label?: string, ...data: any[]): void;
  groupCollapsed(label?: string): void;
  groupEnd(): void;
  info(...data: any[]): void;
  log(...data: any[]): void;
  onChange(callback: (logs: { type: string; message: string }[]) => void): void;
  success(...data: any[]): void;
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
