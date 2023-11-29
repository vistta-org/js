import { isBuiltin } from "node:module";
import { fileURLToPath, pathToFileURL, URLSearchParams } from "node:url";
import { fs } from "@vistta/utils/fs";
import { compilerResolver } from "./typescript.js";

export const TYPE_DEFAULT = "default";
export const TYPE_SCRIPT = "script";
export const TYPE_JSON = "json";
export const TYPE_STYLE = "style";
export const TYPE_TEMPLATE = "template";
export const TYPE_FILE = "file";
export const TYPE_TEXT = "text";
const EXTENSIONS = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "mts", "cts"];
const CONTEXT = {};
const CWD = process.cwd();
const LOADER = {
  [TYPE_SCRIPT]: (await import("./types/script.js")).default,
  [TYPE_JSON]: (await import("./types/json.js")).default,
  [TYPE_STYLE]: (await import("./types/style.js")).default,
  [TYPE_TEMPLATE]: (await import("./types/template.js")).default,
  [TYPE_FILE]: (await import("./types/file.js")).default,
  [TYPE_TEXT]: (await import("./types/text.js")).default,
}

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
  let { bundler, importAssertions: { type } = {} } = ctx || {};
  url = bundler ? pathToFileURL(url.split("?")[0]).href : url.split("?")[0];
  const path = fileURLToPath(url);
  const extension = fs.extname(url).slice(1);
  type = type || resolveType(extension);
  if (type === TYPE_DEFAULT) return next(url, ctx);
  const {
    code,
    warnings,
    errors,
    resources,
    files = [],
  } = LOADER[type](fs.readFileSync(path, type !== TYPE_FILE ? "utf-8" : undefined), { path, extension, bundler });
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

function resolveType(extension) {
  switch (extension) {
    case "js":
    case "mjs":
    case "cjs":
      return TYPE_DEFAULT;
    case "jsx":
    case "tsx":
    case "ts":
    case "mts":
    case "cts":
      return TYPE_SCRIPT;
    case "json":
      return TYPE_JSON;
    case "css":
    case "sass":
    case "scss":
      return TYPE_STYLE;
    default:
      return TYPE_FILE;
  }
}