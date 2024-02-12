import { fs } from "@vistta/utils/fs";
import { build } from "esbuild";
import { dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";

const name = process.env.APP_NAME;
let bundler;

class Bundler {
  loader;
  config = {
    bundle: true,
    write: false,
    outdir: "out",
    legalComments: "none",
    keepNames: true,
    treeShaking: true,
    define: (() => {
      const define = { "process.argv": JSON.stringify(process.argv) };
      const keys = Object.keys(process.env);
      for (let i = 0, len = keys.length; i < len; i++) {
        if (/[():;,.\s]/.test(keys[i])) continue;
        define[`process.env.${keys[i]}`] = JSON.stringify(process.env[keys[i]]);
      }
      define[`process.env`] = JSON.stringify({});
      return define;
    })(),
  };

  constructor(loader) {
    this.loader = loader;
  }

  async run(filename, { mode = process.env.NODE_ENV, exports, globalName, sideEffects, node } = {}) {
    const instance = {
      filename,
      loader: this.loader,
      base: basename(filename),
      exports,
      dir: dirname(filename),
      sideEffects,
      code: "",
      files: [],
      resources: {},
    };
    const filter = /.*/;
    this.config.define["process.env.IS_NODE"] = JSON.stringify(!!node);
    const config = Object.assign({}, this.config, {
      entryPoints: [exports ? "@exports" : filename],
      minify: mode === "production",
      format: globalName ? "iife" : "esm",
      target: "esnext",
      globalName: globalName,
      plugins: [
        {
          name: "vistta",
          setup: (build) => (
            build.onResolve({ filter }, this.resolve.bind(instance)), build.onLoad({ filter }, this.load.bind(instance))
          ),
        },
      ],
    });
    const { outputFiles } = await build(config);
    instance.code = outputFiles?.[0]?.text || "";
    instance.files = Array.from(new Set(instance.files));
    return instance;
  }

  async resolve({ path, importer, resolveDir, kind }) {
    switch (path) {
      case name:
        return { path: "vistta", namespace: "window" };
      case "@content":
        return { path: "content", external: true };
      case "@socket":
        return { path: "/socket.io/socket.io.esm.min.js", external: true };
      case "@exports":
        return { path: this.base, namespace: "exports" };
      default:
        break;
    }
    if (!fs.isAbsolute(importer)) importer = fs.resolve(resolveDir, importer);
    const { final, builtin, file } = await this.loader.resolve(path, {
      conditions: ['bundler'],
      parentURL: pathToFileURL(importer).href
    }, (final, { builtin, file }) => ({ final, builtin, file }));
    if (!builtin && file) return { path: final, sideEffects: this.sideEffects, pluginData: kind === "import-statement" ? importAssertion(importer, path) : {} };
    const exists = await importExists(final);
    if (!builtin && exists) return {};
    return { path: final, namespace: "ignore" };
  }

  async load({ path, namespace, pluginData: importAttributes = {} }) {
    if (namespace === "ignore") return { contents: "" };
    if (namespace === "window") return { contents: `module.exports = window.${path};` };
    if (namespace === "exports")
      return {
        contents: `export { ${this.exports} } from "./${this.base}";`,
        resolveDir: this.dir,
      };
    importAttributes.bundler = true;
    const { source, resources, files = [] } = await this.loader.load(path, { importAttributes }, () => ({}));
    this.files.push(...files);
    if (!source) return { loader: "js" };
    for (let i = 0, len = resources?.length || 0; i < len; i++) {
      const { hash, path, code, compiler } = resources[i];
      this.resources[hash] = path || code || compiler;
    }
    return { contents: source, loader: "js" };
  }
}

export { Bundler }

export default async function (_, { path, ...options }) {
  if (!bundler) bundler = new Bundler(this);
  const { code, files, resources } = await bundler.run(path, options)
  return {
    code: `export const code = ${JSON.stringify(code)}; export const files = ${JSON.stringify(files)}; export const resources = ${JSON.stringify(resources)}`,
    resources: resources
  };
}


//

function importAssertion(importer, path) {
  if (!fs.existsSync(importer)) return {};
  const importAttributes = (new RegExp(`["'](${path})["']\\s+(assert|with)\\s+({[\\s\\S]*?})`, 'g')).exec(fs.readFileSync(importer, "utf-8"))?.[3];
  if (!importAttributes) return {};
  try {
    return eval("(" + importAttributes + ")");
  }
  catch {
    return {};
  }
}

function importExists(module) {
  return new Promise((resolve) => {
    import(module).then(() => resolve(true)).catch(() => resolve(false));
  });
}