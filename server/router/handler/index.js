import { EventEmitter } from "node:events";
import { fs, hash } from "@vistta/utils";
import { extractImports } from "../../../bin/loaders";
import { convertToEventName, ClassFunction, noCache } from "../../../utils";
import PageHandler from "./page";

const IS_DEV = process.env.NODE_ENV === "development";

class Handler extends ClassFunction {
  events = new EventEmitter();
  emit;
  watchedFiles = [];

  constructor({ filepath, pathname, type, callback, ...config }) {
    super((...args) => this.handler && this.handler(...args));
    if (type === "app" || type === "page" || type === "error")
      return new PageHandler({ filepath, pathname, type, callback, ...config });
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.type = type;
    this.emit = (event, ...args) => {
      this.events.emit(event, ...args);
      callback && callback(event, pathname, type, ...args);
    };
  }

  async import(isRefresh) {
    try {
      let exports = await import(isRefresh ? noCache(this.filepath) : this.filepath);
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
            await import(this.filepath, {
              with: {
                type: 'bundler',
                globalName: "__app_" + this.type,
                exports: "default",
              }
            })
          )?.code;
          this.handler = () => exports?.default;
          break;
      }
      if (IS_DEV) this.watch([this.filepath, ...(await extractImports(this.filepath))]);
      this.emit("ready");
    } catch (e) {
      this.emit("error", e.stack);
    }
    return this;
  }

  on(event, callback) {
    this.events.on(event, callback);
  }

  watch(files) {
    for (let i = 0, len = files.length; i < len; i++) {
      if (this.watchedFiles.includes(files[i])) return;
      this.watchedFiles.push(files[i]);
      fs.watchFile(files[i], () => {
        this.emit("change");
        this.import(true);
      });
    }
  }
}

export const useHandler = async (...args) => await new Handler(...args).import();
