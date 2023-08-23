import { fs } from "../../../server/filesystem/index.js";
import { stringify } from "../../../utils/index.js";
import { pathToFileURL, fileURLToPath } from "node:url";
import * as sass from "sass";
import postcss from "postcss";
import autoprefixer from "autoprefixer";

export default function (source, { path }) {
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
  const compiled = sass.compileString(code, {
    style: "compressed",
    loadPaths: [dirname, node_modules],
    functions: {
      "prop($name, $default)": (args) => convertToSass(params[args[0].assertString("name").text], args[1]),
    },
    importer: {
      canonicalize(url) {
        const files = getSassFiles(fs.resolve(dirname, url.startsWith("file:") ? fileURLToPath(new URL(url)) : url));
        for (let i = 0, len = files.length; i < len; i++) {
          if (fs.existsSync(files[i])) return pathToFileURL(files[i]);
        }
        return null;
      },
      load(canonicalUrl) {
        const path = fileURLToPath(canonicalUrl);
        const dirname = fs.dirname(path);
        let contents = "" + fs.readFileSync(path);
        const urls = contents.match(/(?<=url\(("|')?)[^)"']*(?=("|')?\))/g);
        for (let i = 0, len = urls?.length || 0; i < len; i++) {
          const resourcePath = fs.resolve(dirname, urls[i]);
          const hash = fs.fileId(resourcePath) + fs.extname(resourcePath);
          resources.push({ path: resourcePath, hash });
          contents = contents.replace(urls[i], `/resources/${hash}`);
        }
        return {
          contents,
          syntax: fs.extname(path).slice(1),
        };
      },
    },
  });
  return {
    code: postcss([autoprefixer()]).process(compiled?.css || "", { from: undefined })?.css || "",
    resources,
    files: compiled?.loadedUrls,
  };
}

function convertToSass(input, fallback) {
  if (!input || input.length == 0) return fallback;
  switch (typeof input) {
    case "boolean":
      return new sass.SassBoolean(input);
    case "number":
      return new sass.SassNumber(input);
    default:
      input = "" + input;
      if (input?.startsWith("#")) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(input);
        return (
          new sass.SassColor({
            red: parseInt(result[1], 16),
            green: parseInt(result[2], 16),
            blue: parseInt(result[3], 16),
          }) || fallback
        );
      }
      if (input?.startsWith("rgb(") && input.endsWith(")")) {
        const result = input.slice(input.indexOf("(") + 1, input.indexOf(")")).split(",");
        return new sass.SassColor({
          red: parseInt(result[0] || 255),
          green: parseInt(result[1] || 255),
          blue: parseInt(result[2] || 255),
        });
      }
      if (input?.startsWith("rgba(") && input.endsWith(")")) {
        const result = input.slice(input.indexOf("(") + 1, input.indexOf(")")).split(",");
        return new sass.SassColor({
          red: parseInt(result[0] || 255),
          green: parseInt(result[1] || 255),
          blue: parseInt(result[2] || 255),
          alpha: parseInt(result[3] || 255),
        });
      }
      return new sass.SassString(input);
  }
}

function getSassFiles(filepath) {
  const dirname = fs.dirname(filepath);
  const basename = fs.basename(filepath);
  return [
    fs.resolve(dirname, basename + ".sass"),
    fs.resolve(dirname, basename + ".scss"),
    fs.resolve(dirname, "_" + basename + ".sass"),
    fs.resolve(dirname, "_" + basename + ".scss"),
  ];
}
