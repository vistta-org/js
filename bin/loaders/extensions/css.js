import { fs } from "../../../server/filesystem/index.js";
import { hash } from "../../../server/crypto/index.js";
import { stringify } from "../../../utils/index.js";
import sass from "sass";
import postcss from "postcss";
import autoprefixer from "autoprefixer";

export default function (source, { path }) {
  try {
    const dirname = fs.dirname(path);
    const node_modules = fs.resolve(process.cwd(), "node_modules");
    const { code, resources, files } = transform(source, dirname, node_modules);
    const urlHash = hash(path, "md5", "hex");
    resources.push({
      compiler: (params = {}) => transform(source, dirname, node_modules, params).code,
      hash: urlHash,
    });
    return {
      code: `export default createStyle(${stringify({ id: generateId(path), value: code, hash: urlHash })});`,
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
  });
  code = postcss([autoprefixer()]).process(compiled?.css || "", { from: undefined })?.css || "";
  if (code.length == 0) return "";
  const urls = code.match(/(?<=url\(("|')?)[^)"']*(?=("|')?\))/g);
  for (let i = 0, len = urls?.length || 0; i < len; i++) {
    const urlHash = hash(urls[i], "md5", "hex") + fs.extname(urls[i]);
    resources.push({ path: fs.resolve(dirname, urls[i]), hash: urlHash });
    code = code.replace(urls[i], `/resources/${urlHash}`);
  }
  return { code: code, resources, files: compiled?.loadedUrls };
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

function generateId(path) {
  const result = [];
  const id = `${fs.statSync(path).ino}`;
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = (number) => alphabet.charAt(number % alphabet.length);
  for (let i = 0; i < id.length; i += 2) result.push(id.slice(i, i + 2));
  return result.map((v) => letter(+v)).join("");
}
