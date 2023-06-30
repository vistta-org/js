/// <reference types="node"/>
/// <reference types="./console" />

type ServerOptions = {
  http?: number | boolean;
  https?: number | boolean;
  cert?: string;
  key?: string;
  autoStart?: boolean;
  callback?: ListenCallback;
};
type ListenCallback = (info: { protocol: "http" | "https"; port: number }) => void;
type RequestCallback = (request: Request, response: Response) => void;
type UseOptions = {
  callback?: (options: { pathname: string; event: string; type: string }) => void;
  ignore?: RegExp;
  useApiRoute?: boolean;
};

export default class Server {
  constructor(options: ServerOptions);

  listen(callback?: ListenCallback): void;
  listen(protocol: "http" | "https", callback?: ListenCallback): void;

  copy(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  copy(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  delete(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  delete(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  get(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  get(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  move(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  move(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  patch(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  patch(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  post(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  post(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  put(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  put(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  error(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  error(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;

  use(folder: string, pathname: string, options?: UseOptions): void;
  use(folder: string, subdomain: string, pathname: string, options?: UseOptions): void;

  disable(pathname: string): void;
  disable(subdomain: string, pathname: string): void;
  enable(pathname: string): void;
  enable(subdomain: string, pathname: string): void;

  emit(subdomain: string, event: string, ...args: any): void;
  on(subdomain: string, event: string, callback: (...args: any) => void): void;
}

export * from "./crypto";
export * from "./filesystem";
export * from "./process";
