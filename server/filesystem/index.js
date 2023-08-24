import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, extname, basename, isAbsolute } from "node:path";
import { hash } from "../crypto/index.js";

const filesystem = (() => {
  const result = {};
  Object.keys(fs).forEach((method) => {
    if (["promises", "watch"].includes(method)) return;
    result[method] = fs.promises[method] || fs[method];
  });
  return result;
})();

filesystem.resolve = resolve;

filesystem.extname = extname;

filesystem.basename = basename;

filesystem.isAbsolute = isAbsolute;

filesystem.filename = (input) => fileURLToPath(input);

filesystem.dirname = (input) => dirname(new RegExp("[^:]*://").test(input) ? fileURLToPath(input) : input);

filesystem.isDirectory = (path) => fs.existsSync(path) && fs.lstatSync(path).isDirectory();

filesystem.isFile = (path) => fs.existsSync(path) && fs.lstatSync(path).isFile();

filesystem.fileId = (path) => {
  if (!fs.existsSync(path)) return null;
  const stats = fs.statSync(path);
  return hash(`${basename(path)}-${stats.size}-${stats.mtimeMs}`, "md5", "hex");
};

filesystem.watch = (path, options = {}) => {
  let { ignore, throttle = 0 } = options;
  if (ignore) ignore = new RegExp(ignore);
  const watch = async (p, cb) => {
    if (ignore?.test(p)) return;
    if (filesystem.isFile(p)) return fs.watchFile(p, (n, o) => cb(p, n, o));
    const dir = filesystem.isDirectory(p) && (await filesystem.readdir(p));
    for (let i = 0, len = dir?.length || 0; i < len; i++) watch(filesystem.resolve(p, dir[i]), cb);
  };
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () =>
          new Promise((resolve) =>
            setTimeout(
              () => watch(filesystem.resolve(path), (filepath) => resolve({ value: filepath, done: false })),
              throttle,
            ),
          ),
      };
    },
  };
};

export { filesystem as fs };
