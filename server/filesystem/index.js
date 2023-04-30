import fs from "node:fs";
import url from "node:url";
import path from "node:path";

const filesystem = (() => {
  const result = {};
  Object.keys(fs).forEach((method) => {
    if (["promises", "watch"].includes(method)) return;
    result[method] = fs.promises[method] || fs[method];
  });
  return result;
})();

filesystem.resolve = path.resolve;

filesystem.extname = path.extname;

filesystem.basename = path.basename;

filesystem.isAbsolute = path.isAbsolute;

filesystem.filename = (input) => url.fileURLToPath(input);

filesystem.dirname = (input) => path.dirname(new RegExp("[^:]*://").test(input) ? url.fileURLToPath(input) : input);

filesystem.isDirectory = (path) => fs.existsSync(path) && fs.lstatSync(path).isDirectory();

filesystem.isFile = (path) => fs.existsSync(path) && fs.lstatSync(path).isFile();

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
              throttle
            )
          ),
      };
    },
  };
};

export { filesystem as fs };
