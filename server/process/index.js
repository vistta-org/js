import childProcess from "node:child_process";

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
            this.#process = childProcess.spawn(this.main, this.args, { ...this.options, shell: true, detached: false });
            this.#process.stderr.on("data", (data) => console.error("error", `${data || ""}`));
            break;
          case "fork":
            this.#process = childProcess.fork(this.main, this.args, { ...this.options, detached: false });
            break;
        }
        this.#process.on("close", () => (this.#process = null));
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        const pid = this.#process?.pid;
        if (pid) process.kill(pid);
        else this.#process?.kill("SIGINT");
        this.#process = null;
        setTimeout(() => resolve(true), 1000);
      } catch (e) {
        reject(e);
      }
    });
  }

  send(msg, callback) {
    this.#process.send(msg, callback);
  }

  on(callback) {
    this.#process.on("message", callback);
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

export const exec = (command, options = {}) =>
  new Promise((resolve, reject) => {
    const { stdoutAsError, ...execOptions } = Object.assign({ shell: true }, options);
    childProcess.exec(command, execOptions, (err, stdout, stderr) => {
      if (stderr || err) return reject(stdoutAsError ? stdout : stderr || err);
      resolve(stdout);
    });
  });

export default Process;
