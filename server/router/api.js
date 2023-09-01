import { fs } from "../filesystem";
import { resolve } from "../../bin/loaders";
import { system, ExtensibleFunction } from "../../utils";

const isDev = process.env.NODE_ENV === "development";

class API extends ExtensibleFunction {
  watchedFiles = [];

  constructor(filepath, { pathname, callback, isSocket }) {
    super((...args) => this.call(...args));
    this.pathname = pathname;
    this.filepath = filepath;
    this.isSocket = isSocket;
    this.emit = (event) => callback && callback({ filepath, pathname, event, type: "api" });
  }

  async import(isRefresh) {
    try {
      if (this.isSocket) {
        const handlers = await system.import(this.filepath, { cache: !isRefresh });
        this.handlers = Object.keys(handlers).filter((curr) => typeof handlers[curr] === "function");
        this.call = (curr, ...args) => handlers[curr](...args);
      } else this.call = (await system.import(this.filepath, { cache: !isRefresh }))?.default;
      if (isDev) this.watch([this.filepath, ...(await getImportedModules(this.filepath))]);
      this.emit("ready");
    } catch (e) {
      /* Do Nothing */
    }
    return this;
  }

  watch(files) {
    files.forEach((file) => {
      if (this.watchedFiles.includes(file)) return;
      this.watchedFiles.push(file);
      fs.watchFile(file, () => {
        console.log(file);
        this.emit("modified");
        this.import(true);
      });
    });
  }
}

export const useApi = async (...args) => await new API(...args).import();

export default API;

async function getImportedModules(filepath, _imports = new Set()) {
  const imports = (await fs.readFile(filepath, "utf-8"))?.match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g);
  for (let i = 0, len = imports?.length; i < len; i++) {
    const matches = imports[i].match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/);
    if (!matches?.[1]) continue;
    const dirname = fs.dirname(filepath);
    const path = resolve(fs.resolve(dirname, matches[1]), { parentURL: dirname, bundler: true }, (final) => final);
    if (!fs.existsSync(path)) continue;
    _imports.add(path);
    await getImportedModules(path, _imports);
  }
  return Array.from(_imports);
}
