/* eslint-disable no-unused-vars */
import { EventEmitter } from "node:events";
import { date, stringify } from "../../utils/index.js";

const ALL_LOGS = [];
const CONSOLES = [];
const DYNAMIC_LOG_ENABLED = !!process.stdout.isTTY || process.env.DYNAMIC_LOG_ENABLED;
let fixedLogSize = 0;

class Console {
  static reset = "\x1b[0m";
  static bright = "\x1b[1m";
  static dim = "\x1b[2m";
  static underscore = "\x1b[4m";
  static blink = "\x1b[5m";
  static reverse = "\x1b[7m";
  static black = "\x1b[30m";
  static red = "\x1b[31m";
  static green = "\x1b[32m";
  static yellow = "\x1b[33m";
  static blue = "\x1b[34m";
  static magenta = "\x1b[35m";
  static cyan = "\x1b[36m";
  static white = "\x1b[37m";
  #id = "";
  #emitter = new EventEmitter();
  #timers = {};
  #counts = {};
  #logs = [];
  #groups = 0;

  constructor(id) {
    if (typeof id !== "string") throw new Error("Error console needs an id");
    if (CONSOLES.indexOf(id) != -1) throw new Error("Error console id needs to be unique.");
    this.#id = id;
    CONSOLES.push(id);
  }

  announce(...data) {
    this.#apply({ type: "announce", data, color: Console.bright });
  }

  assert(condition, ...data) {
    if (condition) data.unshift(`${Console.green}Assertion passed${Console.reset}`);
    else data.unshift(`${Console.red}Assertion failed${Console.reset}`);
    this.#apply({ type: "assert", data });
  }

  clear() {
    this.#logs.splice(0, this.#logs.length);
    if (this.#id === "") ALL_LOGS.splice(0, ALL_LOGS.length);
    else for (let i = ALL_LOGS.length - 1; i >= 0; i--) {
      const id = ALL_LOGS[i].id;
      if (id === this.#id) ALL_LOGS.splice(i, 1);
    }
    this.#flush();
  }

  count(key = "") {
    if (!this.#counts[key]) this.#counts[key] = 0;
    else this.#counts[key]++;
    this.#apply({ type: "count", data: `${key}: ${this.#counts[key]}`, date: date().toString(true) });
  }

  countReset(key = "") {
    this.#counts[key] = 0;
  }

  print(...data) {
    this.#apply({ type: "debug", data });
  }

  debug(...data) {
    this.#apply({ type: "debug", data, date: date().toString(true) });
  }

  dir(item) {
    this.#apply({ type: "dir", data: [item] });
  }

  dirxml(...data) {
    this.#apply({ type: "dirxml", data });
  }

  error(...data) {
    this.#apply({ type: "error", data, color: Console.red, date: date().toString(true) });
  }

  group(...data) {
    if (data.length) this.#apply({ type: "log", data });
    this.#groups++;
  }

  groupCollapsed() { }

  groupEnd() {
    if (this.#groups > 0) this.#groups--;
  }

  info(...data) {
    this.#apply({ type: "info", data, color: Console.cyan, date: date().toString(true) });
  }

  log(...data) {
    this.#apply({ type: "log", data, date: date().toString(true) });
  }

  onChange(callback) {
    this.#emitter.on("change", callback);
  }

  success(...data) {
    this.#apply({ type: "success", data, color: Console.green, date: date().toString(true) });
  }

  table(data, properties) {
    if (!Array.isArray(data) || data.length === 0) return;
    const isObject = typeof data[0] === "object";
    const headers = ["(index)", ...(isObject ? Object.keys(data[0]) : ["Values"])];
    properties = properties || headers.join('\t');
    this.#apply({ type: "log", data: properties + '\n' + data.map((obj, index) => !isObject ? (index + '\t' + obj) : headers.map(key => key === "(index)" ? index : obj[key]).join('\t')).join('\n') });
  }

  time(key, force = false) {
    if (!force && this.#timers[key]) return console.warn(`${key} already exists.`);
    this.#timers[key] = date();
  }

  timeEnd(key, print = true) {
    if (!this.#timers[key]) return;
    if (print) console.timeStamp(key);
    delete this.#timers[key];
  }

  timeLog(key, ...data) {
    if (!this.#timers[key]) return;
    data.push(`${Console.reset + Console.dim}(${date().diff(this.#timers[key], { units: true })})`);
    this.#apply({ type: "timeLog", data, date: date().toString(true) });
  }

  timeStamp(key) {
    if (!this.#timers[key]) return;
    this.#apply({
      type: "warn",
      data: [`${key} ${Console.reset + Console.dim}(${date().diff(this.#timers[key], { units: true })})`],
      date: date().toString(true),
    });
  }

  trace(...data) {
    const error = new Error();
    data.push("\n" + error.stack.split("\n").slice(2).join("\n"));
    this.#apply({ type: "trace", data, date: date().toString(true) });
  }

  warn(...data) {
    this.#apply({ type: "warn", data, color: Console.yellow, date: date().toString(true) })
  }

  //

  #apply({ type, data, color, date }) {
    if (!(data?.length > 0)) return;
    const log = { id: this.#id, type, date };
    let initial = color || "";
    if (date) initial = `${Console.dim}[${date}]${color || Console.reset} `;
    log.message =
      '\t'.repeat(this.#groups) + data.reduce((message, value, index) => {
        const spacer = index === 0 ? "" : " ";
        if (typeof value === "object") return message + spacer + stringify(value, true);
        return message + spacer + `${value}`;
      }, initial) + Console.reset;
    ALL_LOGS.push(log);
    this.#logs.push(log);
    this.#flush();
  }

  #flush() {
    let output = "";
    let i = 0;
    if (DYNAMIC_LOG_ENABLED) output = "\x1B[2J\x1B[3J\x1B[H\x1Bc";
    else (i = fixedLogSize, fixedLogSize = ALL_LOGS.length);
    for (let len = ALL_LOGS.length; i < len; i++) {
      output += ALL_LOGS[i].message + "\n";
    }
    process.stdout.write(output);
    this.#emitter.emit("change", this.id === "" ? this.#logs : ALL_LOGS);
  }
}

// eslint-disable-next-line no-global-assign
console = new Console("");
global.Console = Console;
