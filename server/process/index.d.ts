import { SpawnOptions, ForkOptions, ExecOptions } from "child_process";

export default class Process {
  constructor(type: "fork" | "spawn", main: string, args?: string[], options?: SpawnOptions | ForkOptions);
  start(): void;
  stop(): void;
}

export function spawn(command: string, args?: string[], options?: SpawnOptions, autoStart?: boolean): Process;

export function fork(file: string, args?: string[], options?: ForkOptions, autoStart?: boolean): Process;

export function exec(command: string, options?: ExecOptions): Process;
