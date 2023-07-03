import { spawn as _spawn, fork as _fork, exec as _exec } from "node:child_process";
import { Worker, SHARE_ENV } from "node:worker_threads";
import { platform } from "node:os";

const USE_SHELL = platform() === "win32";

class Process {
  #process;

  constructor(type, main, args, options) {
    this.type = type;
    if (typeof main !== "string") throw `Invalid argument "${type === "fork" ? "file" : "command"}" must be a string`;
    this.main = main;
    this.args = args || [];
    this.options = options || {};
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        switch (this.type) {
          case "spawn":
            this.#process = _spawn(this.main, this.args, { ...this.options, shell: USE_SHELL, detached: false });
            this.#process.stderr.on("data", (data) => console.error("error", `${data || ""}`));
            this.#process.on("close", () => (this.#process = null));
            break;
          case "fork":
            this.#process = _fork(this.main, this.args, { ...this.options, detached: false });
            this.#process.on("close", () => (this.#process = null));
            break;
          case "worker":
            this.#process = new Worker(this.main, Object.assign({ argv: this.args, env: SHARE_ENV }, this.options));
            this.#process.on("exit", () => (this.#process = null));
            break;
        }
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        switch (this.type) {
          case "spawn":
          case "fork":
            var pid = this.#process?.pid;
            if (pid) process.kill(pid);
            else this.#process?.kill("SIGINT");
            break;
          case "worker":
            this.#process.terminate();
            break;
        }
        this.#process = null;
        setTimeout(() => resolve(true), 1000);
      } catch (e) {
        reject(e);
      }
    });
  }

  sendMessage(msg) {
    switch (this.type) {
      case "spawn":
      case "fork":
        this.#process.send(msg);
        break;
      case "worker":
        this.#process.postMessage(msg);
        break;
    }
  }

  on(...args) {
    if (args.length === 1) args.unshift("message");
    if (args.length != 2) return;
    const [event, callback] = args;
    if (this.type === "worker") this.#process.on(event === "close" ? "exit" : event, callback);
    else this.#process.on(event === "exit" ? "close" : event, callback);
  }
}

export const spawn = async (command, args, options, autoStart = true) => {
  const result = new Process("spawn", command, args, options);
  if (autoStart) await result.start();
  return result;
};

export const fork = async (file, args, options, autoStart = true) => {
  const result = new Process("fork", file, args, options);
  if (autoStart) await result.start();
  return result;
};

export const run = async (file, args, options, autoStart = true) => {
  const result = new Process("worker", file, args, options);
  if (autoStart) await result.start();
  return result;
};

export const exec = (command, options = {}) =>
  new Promise((resolve, reject) => {
    const { stdoutAsError, ...execOptions } = Object.assign({ shell: USE_SHELL }, options);
    _exec(command, execOptions, (err, stdout, stderr) => {
      console.log(err);
      //if (stderr || err) return reject(stdoutAsError ? stdout : stderr || err);
      resolve(stdout);
    });
  });
