import { SpawnOptions, ForkOptions, ExecOptions } from "child_process";
import { WorkerOptions } from "worker_threads";

declare class Process<T = "spawn" | "fork" | "worker"> {
  constructor(type: T, main: string, args?: string[], options?: SpawnOptions | ForkOptions | WorkerOptions);
  start(): void;
  stop(): void;
  sendMessage(msg: any): void;
  on(callback: (msg: any) => void): void;
  on(event: string, callback: (msg: any) => void): void;
}

export function spawn(command: string, args?: string[], options?: SpawnOptions, autoStart?: boolean): Process<"spawn">;

export function fork(file: string, args?: string[], options?: ForkOptions, autoStart?: boolean): Process<"fork">;

export function run(file: string, args?: string[], options?: WorkerOptions, autoStart?: boolean): Process<"worker">;

export function exec(command: string, options?: ExecOptions): Process;
