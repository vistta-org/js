import { EventEmitter } from "node:events";
import { date, stringify } from "../../utils/index.js";

const emitter = new EventEmitter();
const logs = [];
const timers = {};
const counts = {};
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

process.stdout.write("\r\u001b[3J\u001b[1J");
process.stdout.write("\r\u001b[2J\u001b[0;0H");

// eslint-disable-next-line no-global-assign
console = {
  code: code,
  announce: (...data) => {
    apply({ type: "announce", data, color: code.bright });
    update();
  },
  assert: (condition, ...data) => {
    if (condition) data.unshift(`${code.green}Assertion passed${code.reset}`);
    else data.unshift(`${code.red}Assertion failed${code.reset}`);
    apply({ type: "assert", data });
    update();
  },
  clear: () => {
    logs.splice(0, logs.length);
    update();
  },
  count: (key = "") => {
    if (!counts[key]) counts[key] = 0;
    else counts[key]++;
    apply({ type: "count", data: `${key}: ${counts[key]}`, date: date().toString(true) });
    update();
  },
  countReset: (key = "") => {
    counts[key] = 0;
  },
  debug: (...data) => {
    apply({ type: "debug", data });
    update();
  },
  dir: (item, options) => {
    apply({ type: "dir", data: [item] });
    update();
  },
  dirxml: (...data) => {
    apply({ type: "dirxml", data });
    update();
  },
  error: (...data) => {
    apply({ type: "error", data, color: code.red, date: date().toString(true) });
    update();
  },
  group: (key, ...data) => {},
  groupCollapsed: (key, ...data) => {},
  groupEnd: (key) => {},
  info: (...data) => {
    apply({ type: "info", data, color: code.cyan, date: date().toString(true) });
    update();
  },
  log: (...data) => {
    apply({ type: "log", data, date: date().toString(true) });
    update();
  },
  onChange: (callback) => emitter.on("change", callback),
  sucess: (...data) => {
    apply({ type: "sucess", data, color: code.green, date: date().toString(true) });
    update();
  },
  table: (tabularData, properties) => {},
  time: (key, force = false) => {
    if (!force && timers[key]) return console.warn(`${key} already exists.`);
    timers[key] = date();
  },
  timeEnd: (key, print = true) => {
    if (!timers[key]) return;
    if (print) console.timeStamp(key);
    delete timers[key];
  },
  timeLog: (key, ...data) => {
    if (!timers[key]) return;
    data.push(`${code.reset + code.dim}(${date().diff(timers[key], { units: true })})`);
    apply({ type: "timeLog", data, date: date().toString(true) });
    update();
  },
  timeStamp: (key) => {
    if (!timers[key]) return;
    apply({
      type: "warn",
      data: `${key} ${code.reset + code.dim}(${date().diff(timers[key], { units: true })})`,
      date: date().toString(true),
    });
    update();
  },
  trace: (...data) => {
    const error = new Error();
    data.push("\n" + error.stack.split("\n").slice(2).join("\n"));
    apply({ type: "trace", data, date: date().toString(true) });
  },
  warn: (...data) => {
    apply({ type: "warn", data, color: code.yellow, date: date().toString(true) });
    update();
  },
};

function apply({ type, data, color, date }) {
  if (!(data?.length > 0)) return;
  const log = { type, date };
  let initial = color || "";
  if (date) initial = `${code.dim}[${date}]${color || code.reset} `;
  log.message =
    data.reduce((message, value, index) => {
      const spacer = index === 0 ? "" : " ";
      if (typeof value === "object") return message + spacer + stringify(value, true);
      return message + spacer + `${value}`;
    }, initial) + code.reset;
  logs.push(log);
}

function update() {
  process.stdout.write("\r\u001b[3J\u001b[1J");
  process.stdout.write("\r\u001b[2J\u001b[0;0H");
  for (let i = 0, len = logs.length; i < len; i++) {
    process.stdout.write(logs[i].message + "\n");
  }
  emitter.emit("change", logs);
}
