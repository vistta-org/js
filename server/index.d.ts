/// <reference types="../global" />
/// <reference types="node"/>

type ListenCallback = (info: { protocol: "http" | "https"; port: number }) => void;
type HTTP_TYPES = "delete" | "get" | "post" | "put";
type RequestCallback = (request: Request, response: Response) => void;
type DefaultCallback = (info: { path: string; href: string; refresh: boolean }) => void;

export default class Server {
  constructor(ports: { http: number; https: number }, certs: { cert: string; key: string });
  constructor(ports: { http: number; https: number }, certs: { cert: string; key: string }, autoStart?: boolean);
  constructor(ports: { http: number; https: number }, certs: { cert: string; key: string }, callback?: ListenCallback);

  listen(callback?: ListenCallback): void;
  listen(protocol: "http" | "https", callback?: ListenCallback): void;

  copy(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  copy(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  delete(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  delete(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
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

  get(pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  get(pathname: string, fileOrFolder: string, callback?: RequestCallback): void;
  get(subdomain: string, pathname: string, callback: RequestCallback, ...callbacks: RequestCallback[]): void;
  get(subdomain: string, pathname: string, fileOrFolder: string, callback?: RequestCallback): void;
  /*
  remove(type: HTTP_TYPES | string, path: string, subdomain?: string): void;
  proxy(path: string, options: {});
  redirect(path: string, target: URL);
  on(event: string, callback: (...args: any) => void): void;
  emit(event: string, ...args: any): void;*/
}

export * from "./console";
export * from "./crypto";
export * from "./filesystem";
export * from "./process";
