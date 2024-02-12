import { isBuiltin } from "node:module";
import { fileURLToPath, pathToFileURL, URLSearchParams } from "node:url";
import { fs } from "@vistta/utils/fs";
import { compilerResolver } from "./typescript.js";

export const TYPE_DEFAULT = "default";
export const TYPE_BUFFER = "buffer";
export const TYPE_BUNDLER = "bundler";
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
  [TYPE_BUFFER]: (await import("./types/buffer.js")).default,
  [TYPE_BUNDLER]: (await import("./types/bundler.js")).default,
  [TYPE_SCRIPT]: (await import("./types/script.js")).default,
  [TYPE_JSON]: (await import("./types/json.js")).default,
  [TYPE_STYLE]: (await import("./types/style.js")).default,
  [TYPE_TEMPLATE]: (await import("./types/template.js")).default,
  [TYPE_FILE]: (await import("./types/file.js")).default,
  [TYPE_TEXT]: (await import("./types/text.js")).default,
}
const ACCEPTABLE_TYPES = Object.keys(LOADER);

export async function resolve(specifier, context, next, options) {
  [specifier, options] = specifier.split(/\?(.*)/);
  options = new URLSearchParams(options);
  const { parentURL = CWD, conditions: [type] = [] } = context;
  if (isBuiltin(specifier)) {
    if (type === "bundler") context.builtin = true;
    return next(specifier, context);
  }

  specifier = compilerResolver(specifier, CWD + "/");
  if (!/^(\w:|\.?\.?\/)/.test(specifier)) return next(specifier, context);
  if (specifier?.startsWith("file://")) specifier = fileURLToPath(specifier);
  specifier = resolver(specifier, { cwd: parentURL });

  if (type === "bundler") {
    if (fs.isAbsolute(specifier)) context.file = true;
    return next(specifier, context);
  }

  specifier = pathToFileURL(specifier).href;
  const useCache = !options.has("noCache") && CONTEXT[parentURL]?.useCache !== false;
  CONTEXT[specifier] = { useCache };
  if (!useCache) return next(`${specifier}?${Date.now()}`, context);
  return next(specifier, context);
}

export async function load(url, context, next) {
  if (isBuiltin(url)) return next(url, context);
  const { ...options } = context?.importAttributes || {};
  url = options.bundler ? pathToFileURL(url.split("?")[0]).href : url.split("?")[0];
  options.path = fileURLToPath(url);
  options.extension = fs.extname(url).slice(1);

  const loader = resolveLoader(options);
  if (loader === TYPE_DEFAULT) return next(url, context);
  const {
    code,
    warnings,
    errors,
    resources,
    files = [],
  } = await LOADER[loader].call({ load, resolve }, await fs.readFile(options.path, loader !== TYPE_FILE ? "utf-8" : undefined), options);
  if (errors?.length) throw new Error(errors.join("\n"));
  warnings?.forEach((warning) => console.warn(`Loader Warning: ${warning}\n`));
  return {
    format: "module",
    shortCircuit: true,
    source: code,
    resources: resources,
    files: [options.path, ...files.map((url) => fileURLToPath(url))],
  };
}

export async function extractImports(filepath, importSet = new Set()) {
  const imports = (await fs.readFile(filepath, "utf-8"))?.match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g);
  for (let i = 0, len = imports?.length; i < len; i++) {
    const matches = imports[i].match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/);
    if (!matches?.[1]) continue;
    const dirname = fs.dirname(filepath);
    const path = resolve(fs.resolve(dirname, matches[1]), { conditions: ['bundler'], parentURL: pathToFileURL(filepath).href }, (final) => final);
    if (!fs.existsSync(path)) continue;
    importSet.add(path);
    await extractImports(path, importSet);
  }
  return Array.from(importSet);
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

function resolveLoader({ type, extension }) {
  if (ACCEPTABLE_TYPES.includes(type)) return type;
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