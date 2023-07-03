/* eslint-disable no-unused-vars */
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
const DYNAMIC_LOG_ENABLED = !!process.stdout.isTTY;
let nonTTY = 0;

// eslint-disable-next-line no-global-assign
console = {
  code: code,
  announce: (...data) => apply({ type: "announce", data, color: code.bright }),
  assert: (condition, ...data) => {
    if (condition) data.unshift(`${code.green}Assertion passed${code.reset}`);
    else data.unshift(`${code.red}Assertion failed${code.reset}`);
    apply({ type: "assert", data });
  },
  clear: () => {
    logs.splice(0, logs.length);
    flush();
  },
  count: (key = "") => {
    if (!counts[key]) counts[key] = 0;
    else counts[key]++;
    apply({ type: "count", data: `${key}: ${counts[key]}`, date: date().toString(true) });
  },
  countReset: (key = "") => {
    counts[key] = 0;
  },
  print: (...data) => apply({ type: "debug", data }),
  debug: (...data) => apply({ type: "debug", data, date: date().toString(true) }),
  dir: (item, options) => apply({ type: "dir", data: [item] }),
  dirxml: (...data) => apply({ type: "dirxml", data }),
  error: (...data) => apply({ type: "error", data, color: code.red, date: date().toString(true) }),
  group: (key, ...data) => {},
  groupCollapsed: (key, ...data) => {},
  groupEnd: (key) => {},
  info: (...data) => apply({ type: "info", data, color: code.cyan, date: date().toString(true) }),
  log: (...data) => apply({ type: "log", data, date: date().toString(true) }),
  onChange: (callback) => emitter.on("change", callback),
  sucess: (...data) => apply({ type: "sucess", data, color: code.green, date: date().toString(true) }),
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
  },
  timeStamp: (key) => {
    if (!timers[key]) return;
    apply({
      type: "warn",
      data: `${key} ${code.reset + code.dim}(${date().diff(timers[key], { units: true })})`,
      date: date().toString(true),
    });
  },
  trace: (...data) => {
    const error = new Error();
    data.push("\n" + error.stack.split("\n").slice(2).join("\n"));
    apply({ type: "trace", data, date: date().toString(true) });
  },
  warn: (...data) => apply({ type: "warn", data, color: code.yellow, date: date().toString(true) }),
};

function apply({ type, data, color, date, update, replace }) {
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
  if (replace) {
    logs[replace] = log;
    flush();
    return;
  }
  if (update) logs.splice(update, 1);
  let index = logs.push(log) - 1;
  flush();
  if (update) return index;
  return {
    update: (...updatedData) => {
      index = apply({ type, data: updatedData, color, date, update: index });
    },
    replace: (...updatedData) => apply({ type, data: updatedData, color, date: date().toString(true), replace: index }),
  };
}

function flush() {
  let output = "",
    i = 0;
  if (DYNAMIC_LOG_ENABLED) output = "\x1B[2J\x1B[3J\x1B[H\x1Bc";
  else {
    i = nonTTY;
    nonTTY = logs.length;
  }
  for (let len = logs.length; i < len; i++) {
    output += "\n" + logs[i].message;
  }
  process.stdout.write(output);
  emitter.emit("change", logs);
}
