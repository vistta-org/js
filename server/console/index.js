import { EventEmitter } from "node:events";
import { date } from "@/utils/date.js";

const code = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export class Console {
  #emitter = new EventEmitter();
  #logs = [];
  #timers = {};
  #map = {
    announce: "log",
    timeEnd: "log",
  };
  constructor(console, clear = true) {
    if (clear) this.#reset();
    const backup = { ...console };
    const methods = Object.keys(backup);
    for (let i = 0, len = methods.length; i < len; i++) {
      const method = methods[i];
      console[methods[i]] = this.#apply(method, backup);
    }
    console.announce = this.#apply("announce", backup);
    console.clear = () => this.#reset();
    console.time = (key) => (this.#timers[key] = date());
    console.timeEnd = (key, text, type = "log") => {
      if (!this.#timers[key]) return;
      this.#apply(type, backup)(
        text || key,
        `${code.reset + code.dim}(${date().diff(this.#timers[key], { units: true })})${code.reset}`
      );
    };
    console.code = code;
  }

  #apply(method, backup) {
    return (...args) => {
      const color = useColor(method);
      if (useDate(method)) {
        args.unshift(`${code.dim}[${date().toString(true)}]${color || code.reset} %s`);
        args.push(code.reset);
      } else if (color) {
        args.unshift(`${color}%s`);
        args.push(code.reset);
      }
      backup[this.#map[method] || method].call(null, ...args);
      this.#logs.push({ type: method, args });
      this.#emitter.emit("change", this.#logs);
    };
  }

  #reset() {
    this.#logs.splice(0, this.#logs.length);
    process.stdout.write("\r\u001b[3J\u001b[1J");
    process.stdout.write("\r\u001b[2J\u001b[0;0H");
  }
}

function useDate(type) {
  return ["log", "warn", "sucess", "info", "error", "group"].includes(type);
}

function useColor(type) {
  switch (type) {
    case "warn":
      return code.yellow;
    case "sucess":
      return code.green;
    case "info":
      return code.cyan;
    case "error":
      return code.red;
    case "announce":
      return code.bright;
  }
  return null;
}
