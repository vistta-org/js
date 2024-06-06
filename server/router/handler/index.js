import { EventEmitter } from "node:events";
import fs from "@vistta/fs";
import { system, convertToEventName, FunctionClass } from "../../../utils";
import PageHandler from "./page";

class Handler extends FunctionClass {
  events = new EventEmitter();
  emit;
  watchedFiles = [];

  constructor({ filepath, pathname, type, callback, ...config }) {
    super((...args) => this.handler && this.handler(...args));
    if (type === "app" || type === "page" || type === "error")
      return new PageHandler({ filepath, pathname, type, callback, ...config });
    this.id = fs.fileId(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.type = type;
    this.emit = (event, ...args) => {
      this.events.emit(event, ...args);
      callback && callback(event, pathname, type, ...args);
    };
  }

  async import() {
    try {
      let exports = await system.import(this.filepath);
      switch (this.type) {
        case "middleware":
          this.handler = exports?.default;
          break;
        case "api":
          this.handler = exports?.default;
          break;
        case "socket":
          var handlers = Object.keys(exports);
          this.handler = (on) => {
            for (let i = 0, len = handlers.length; i < len; i++) {
              const name = handlers[i],
                handler = exports[name];
              if (typeof handler !== "function") continue;
              const event = convertToEventName(name);
              if (event) on(event, (socket, args) => handler(socket, ...args));
            }
          };
          break;
        case "template":
          this.code = (
            await system.import(this.filepath, {
              with: {
                type: "bundler",
                globalName: "__app_" + this.type,
                exports: "default",
              },
            })
          )?.code;
          this.handler = () => exports?.default;
          break;
      }
      this.emit("ready");
    } catch (e) {
      this.emit("error", e.stack);
    }
    return this;
  }

  on(event, callback) {
    this.events.on(event, callback);
  }
}

export const useHandler = async (...args) =>
  await new Handler(...args).import();
