import { fs } from "../../filesystem";
import { hash } from "../../crypto";
import { bundle, resolveImports } from "./bundler.js";
import { system, convertToEventName, ExtensibleFunction } from "../../../utils";
import PageHandler from "./page";

const IS_DEV = process.env.NODE_ENV === "development";

class Handler extends ExtensibleFunction {
  watchedFiles = [];

  constructor({ filepath, pathname, type, callback, ...config }) {
    super((...args) => this.handler && this.handler(...args));
    if (type === "app" || type === "page" || type === "error")
      return new PageHandler({ filepath, pathname, type, callback, ...config });
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.type = type;
    this.emit = (event, ...args) => callback && callback(event, pathname, type, ...args);
  }

  async import(isRefresh) {
    try {
      let exports = await system.import(this.filepath, { cache: !isRefresh });
      switch (this.type) {
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
        case "store":
          exports = exports?.default || {};
          exports.__code = (
            await bundle(this.filepath, {
              globalName: "__app_store",
              exports: "default",
            })
          )?.code;
          this.handler = () => exports;
          break;
      }
      if (IS_DEV) this.#watch([this.filepath, ...(await resolveImports(this.filepath))]);
      this.emit("ready");
    } catch (e) {
      this.emit("error", e.stack);
    }
    return this;
  }

  #watch(files) {
    files.forEach((file) => {
      if (this.watchedFiles.includes(file)) return;
      this.watchedFiles.push(file);
      fs.watchFile(file, () => {
        this.emit("modified");
        this.import(true);
      });
    });
  }
}

export const useHandler = async (...args) => await new Handler(...args).import();
