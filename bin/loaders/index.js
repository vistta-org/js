import { isBuiltin } from "node:module";
import { fileURLToPath, pathToFileURL, URLSearchParams } from "node:url";
import { fs } from "../../server/filesystem/index.js";
import { compilerResolver } from "./typescript.js";
import script from "./extensions/script.js";
import css from "./extensions/css.js";
import html from "./extensions/html.js";
import json from "./extensions/json.js";
import file from "./extensions/file.js";

const EXTENSIONS = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "mts", "cts"];
const CONTEXT = {};
const CWD = process.cwd();

export function resolve(specifier, context, next, options) {
  [specifier, options] = specifier.split(/\?(.*)/);
  options = new URLSearchParams(options);
  const { parentURL = CWD, bundler } = context;
  if (isBuiltin(specifier)) {
    if (bundler) context.builtin = true;
    return next(specifier, context);
  }
  specifier = compilerResolver(specifier, CWD + "/");
  if (!/^(\w:|\.?\.?\/)/.test(specifier)) return next(specifier, context);
  if (specifier?.startsWith("file://")) specifier = fileURLToPath(specifier);
  specifier = resolver(specifier, { cwd: parentURL });
  const isAbsolute = fs.isAbsolute(specifier);
  //
  if (bundler) {
    if (isAbsolute) context.file = true;
    return next(specifier, context);
  }
  //
  const useCache = !options.has("noCache") && CONTEXT[fileURLToPath(parentURL)]?.useCache !== false;
  CONTEXT[specifier] = { useCache };
  specifier = pathToFileURL(specifier).href;
  if (!useCache) return next(`${specifier}?${Date.now()}`, context);
  return next(specifier, context);
}

export function load(url, ctx, next) {
  if (isBuiltin(url)) return next(url, ctx);
  const bundler = ctx.bundler;
  url = bundler ? pathToFileURL(url.split("?")[0]).href : url.split("?")[0];
  const path = fileURLToPath(url);
  const extension = fs.extname(url).slice(1);
  if (["js", "mjs", "cjs"].includes(extension)) return next(url, ctx);
  const {
    code,
    warnings,
    errors,
    resources,
    files = [],
  } = (() => {
    if (["jsx", "tsx", "ts", "mts", "cts"].includes(extension))
      return script(fs.readFileSync(path, "utf-8"), { path, extension, bundler });
    else if (["css", "sass", "scss"].includes(extension))
      return css(fs.readFileSync(path, "utf-8"), { path, extension, bundler });
    else if (["json"].includes(extension)) return json(fs.readFileSync(path, "utf-8"), { path, extension, bundler });
    else if (["html"].includes(extension)) return html(fs.readFileSync(path, "utf-8"), { path, extension, bundler });
    return file(path, { path, extension, bundler });
  })();
  if (errors?.length) throw new Error(errors.join("\n"));
  warnings?.forEach((warning) => console.warn(`Loader Warning: ${warning}\n`));
  return {
    format: "module",
    shortCircuit: true,
    source: code,
    resources: resources,
    files: [path, ...files.map((url) => fileURLToPath(url))],
  };
}

//

function resolver(specifier, { cwd = process.cwd(), extensions = EXTENSIONS } = {}) {
  const fallback = "" + specifier;
  if (!fs.isAbsolute(specifier)) specifier = fs.resolve(cwd?.startsWith("file://") ? fs.dirname(cwd) : cwd, specifier);
  if (fs.existsSync(specifier)) {
    if (!fs.isDirectory(specifier)) return specifier;
    for (let i = 0, len = extensions.length; i < len; i++) {
      const cur = fs.resolve(specifier, `index.${extensions[i]}`);
      if (fs.existsSync(cur)) return cur;
    }
  }
  for (let i = 0, len = extensions.length; i < len; i++) {
    const cur = specifier + `.${extensions[i]}`;
    if (fs.existsSync(cur)) return cur;
  }
  return fallback;
}
