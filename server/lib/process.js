import childProcess from "node:child_process";

class Process {
  constructor(type, main, args, options) {
    this.type = type;
    if (typeof main !== "string") throw `Invalid argument "${type === "fork" ? "file" : "command"}" must be a string`;
    this.main = main;
    this.args = args || [];
    this.options = options || {};
    this.node = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        switch (this.type) {
          case "spawn":
            this.node = childProcess.spawn(this.main, this.args, { ...this.options, shell: true, detached: false });
            this.node.stderr.on("data", (data) => console.error("error", `${data || ""}`));
            break;
          case "fork":
            this.node = childProcess.fork(this.main, this.args, { ...this.options, detached: false });
            break;
        }
        this.node.on("close", () => (this.node = null));
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        const pid = this.node?.pid;
        if (pid) process.kill(pid);
        else this.node?.kill("SIGINT");
        this.node = null;
        setTimeout(() => resolve(true), 1000);
      } catch (e) {
        reject(e);
      }
    });
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
