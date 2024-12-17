import fs from "@vistta/fs";
import { RESOURCES_PATH, stringify } from "../../utils/index.js";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { compileStringAsync as compileSassString, SassBoolean, SassNumber, SassString, SassColor } from 'sass-embedded';
import postcss from "postcss";
import autoprefixer from "autoprefixer";

const EXT = [".sass", ".scss", ".css"];
const require = createRequire(import.meta.url);

export async function load(source, { path, bundler }) {
  try {
    const dirname = fs.dirname(path);
    const id = fs.fileId(path);
    const hash = id + ".css";
    const { code, resources, files } = await transform(
      source,
      dirname,
      fs.resolve(process.cwd(), "node_modules"),
    );
    resources.push({ hash, code });
    return {
      code: `export default style(${stringify(id)}, ${JSON.stringify(bundler ? "" : code)});`,
      resources,
      files,
    };
  } catch (e) {
    return { errors: [`${path}(0,0): style error: ${e.message}`] };
  }
}

export async function setScope(code, id) {
  const scope = `style-${id}`;
  let stylesheet = (await compileSassString(`[${scope}] { ${code || ""} }`, { style: "compressed" })).css;
  const matches = stylesheet.match(new RegExp(`\\[${scope}\\] [^\\s]+(:root|:scope|:scoped)\\b`, "g"));
  for (let i = 0, len = matches?.length || 0; i < len; i++)
    stylesheet = stylesheet.replace(matches[i], m => m.split(`[${scope}] `)[1].replace(/:root|:scope|:scoped/g, `[${scope}]`));
  return stylesheet;
}

//

async function transform(code, dirname, node_modules, params = {}) {
  const resources = [];
  const compiled = await compileSassString(loadResources(dirname, code, resources), {
    style: "compressed",
    loadPaths: [dirname, node_modules],
    silenceDeprecations: ["mixed-decls"],
    functions: {
      "prop($name, $default)": (args) =>
        convertToSass(params[args[0].assertString("name").text], args[1]),
    },
    importers: [
      {
        canonicalize(url) {
          return resolve(dirname, url);
        },
        load(canonicalUrl) {
          const path = fileURLToPath(canonicalUrl);
          return {
            contents: loadResources(
              fs.dirname(path),
              "" + fs.readFileSync(path),
              resources,
            ),
            syntax: fs.extname(path).slice(1),
          };
        },
      },
    ],
  });
  return {
    code:
      postcss([autoprefixer()]).process(compiled.css || "", {
        from: undefined,
      })?.css || "",
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
    code = code.replace(urls[i], `/${RESOURCES_PATH}/${hash}`);
  }
  return code;
}

function convertToSass(input, fallback) {
  if (!input || input.length == 0) return fallback;
  switch (typeof input) {
    case "boolean":
      return new SassBoolean(input);
    case "number":
      return new SassNumber(input);
    case "string":
      if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(input)) {
        const color = [...input.matchAll(/([0-9A-Fa-f]{2})/g)].map(
          (match) => match[1],
        );
        return new SassColor({
          red: parseInt(color[0], 16),
          green: parseInt(color[1], 16),
          blue: parseInt(color[2], 16),
          alpha: parseInt(color[3], 16),
        });
      }
      if (
        /^rgba?\((\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,?\s*(\d*\.?\d+)?\s*)\)$/.test(
          input,
        )
      ) {
        const color = input
          .match(
            /rgba?\((\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,?\s*(\d*\.?\d+)?\s*)\)/,
          )[1]
          .split(",");
        return new SassColor({
          red: parseInt(color[0] || 255),
          green: parseInt(color[1] || 255),
          blue: parseInt(color[2] || 255),
          alpha: parseInt(color[3] || 255),
        });
      }
      return new SassString(input);
    default:
      return fallback;
  }
}

function resolve(dirname, path) {
  if (path.startsWith("file:")) path = fileURLToPath(new URL(path));
  else {
    try {
      return pathToFileURL(require.resolve(path));
    }
    catch {
      path = fs.resolve(dirname, path);
    }
  }
  dirname = fs.dirname(path);
  const basename = fs.basename(path);
  for (let i = 0, len = EXT.length; i < len; i++) {
    const file = `${dirname}/${basename}${EXT[i]}`;
    if (fs.existsSync(file)) return pathToFileURL(file);
  }
  for (let i = 0, len = EXT.length; i < len; i++) {
    const file = `${dirname}/_${basename}${EXT[i]}`;
    if (fs.existsSync(file)) return pathToFileURL(file);
  }
  return null;
}