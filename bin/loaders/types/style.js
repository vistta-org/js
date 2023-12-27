import { fs } from "@vistta/utils/fs";
import { stringify, parse } from "../../../utils/index.js";
import { pathToFileURL, fileURLToPath } from "node:url";
import * as sass from "sass";
import postcss from "postcss";
import autoprefixer from "autoprefixer";

export default async function (source, { path }) {
  try {
    const dirname = fs.dirname(path);
    const node_modules = fs.resolve(process.cwd(), "node_modules");
    const { code, resources, files } = transform(source, dirname, node_modules);
    const id = fs.fileId(path);
    const hash = id + fs.extname(path);
    resources.push({
      compiler: (params = {}) => transform(source, dirname, node_modules, params).code,
      hash,
    });
    return {
      code: `export default (${stringify({ id, raw: code, hash, path })});`,
      resources,
      files,
    };
  } catch (e) {
    return { errors: [`${path}(0,0): style error: ${e.message}`] };
  }
}

//

function transform(code, dirname, node_modules, params = {}) {
  const resources = [];
  const compiled = sass.compileString(loadResources(dirname, code, resources), {
    style: "compressed",
    loadPaths: [dirname, node_modules],
    functions: {
      "prop($name, $default)": (args) => convertToSass(params[args[0].assertString("name").text], args[1]),
    },
    importers: [
      {
        canonicalize(url) {
          const isURL = url.startsWith("file:");
          if (isURL) url = fileURLToPath(new URL(url));
          const files = getSassFiles(fs.resolve(dirname, url));
          for (let i = 0, len = files.length; i < len; i++) {
            if (fs.existsSync(files[i])) return pathToFileURL(files[i]);
          }
          if (!isURL) {
            const files = getSassFiles(fs.resolve(node_modules, url), true);
            for (let i = 0, len = files.length; i < len; i++) {
              if (fs.existsSync(files[i])) return pathToFileURL(files[i]);
            }
          }
          return null;
        },
        load(canonicalUrl) {
          const path = fileURLToPath(canonicalUrl);
          return {
            contents: loadResources(fs.dirname(path), "" + fs.readFileSync(path), resources),
            syntax: fs.extname(path).slice(1),
          };
        },
      },
    ],
  });
  return {
    code: postcss([autoprefixer()]).process(compiled?.css || "", { from: undefined })?.css || "",
    resources,
    files: compiled?.loadedUrls,
  };
}

function loadResources(dirname, code, resources) {
  const urls = code.match(/(?<=url\(("|')?)[^)"']*(?=("|')?\))/g);
  for (let i = 0, len = urls?.length || 0; i < len; i++) {
    if (urls[i].startsWith("data:")) continue;
    const resourcePath = fs.resolve(dirname, urls[i]);
    const hash = fs.fileId(resourcePath) + fs.extname(resourcePath);
    resources.push({ path: resourcePath, hash });
    code = code.replace(urls[i], `/resources/${hash}`);
  }
  return code;
}

function convertToSass(input, fallback) {
  if (!input || input.length == 0) return fallback;
  switch (typeof input) {
    case "boolean":
      return new sass.SassBoolean(input);
    case "number":
      return new sass.SassNumber(input);
    case "string":
      if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(input)) {
        const color = [...input.matchAll(/([0-9A-Fa-f]{2})/g)].map((match) => match[1]);
        return new sass.SassColor({
          red: parseInt(color[0], 16),
          green: parseInt(color[1], 16),
          blue: parseInt(color[2], 16),
          alpha: parseInt(color[3], 16),
        });
      }
      if (/^rgba?\((\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,?\s*(\d*\.?\d+)?\s*)\)$/.test(input)) {
        const color = input.match(/rgba?\((\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,?\s*(\d*\.?\d+)?\s*)\)/)[1].split(",");
        return new sass.SassColor({
          red: parseInt(color[0] || 255),
          green: parseInt(color[1] || 255),
          blue: parseInt(color[2] || 255),
          alpha: parseInt(color[3] || 255),
        });
      }
      return new sass.SassString(input);
    default:
      return fallback;
  }
}

function getSassFiles(filepath, isModule) {
  const result = [
    fs.resolve(filepath, "index.sass"),
    fs.resolve(filepath, "index.scss"),
    fs.resolve(filepath, "index.css"),
    fs.resolve(filepath, "_index.sass"),
    fs.resolve(filepath, "_index.scss"),
    fs.resolve(filepath, "_index.css"),
  ];
  if (isModule) {
    const { main, style } = parse(fs.readFileSync(fs.resolve(filepath, "package.json"), "utf8"), true);
    if (isStylesheet(style)) result.unshift(fs.resolve(filepath, style));
    if (isStylesheet(main)) result.unshift(fs.resolve(filepath, main));
  } else {
    const dirname = fs.dirname(filepath);
    const basename = fs.basename(filepath);
    result.unshift(
      fs.resolve(dirname, basename + ".sass"),
      fs.resolve(dirname, basename + ".scss"),
      fs.resolve(dirname, basename + ".css"),
      fs.resolve(dirname, "_" + basename + ".sass"),
      fs.resolve(dirname, "_" + basename + ".scss"),
      fs.resolve(dirname, "_" + basename + ".css"),
    );
  }
  return result;
}

function isStylesheet(file) {
  return [".sass", ".scss", ".css"].includes(fs.extname(file || ""));
}
