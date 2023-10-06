import { fs } from "../../filesystem";
import { resolve, load } from "../../../bin/loaders";
import { build } from "esbuild";
import { dirname, basename } from "path";

const name = process.env.APP_NAME;
class Bundler {
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

  constructor() {}

  async run(filename, { mode = process.env.NODE_ENV, exports, globalName, sideEffects } = {}) {
    const instance = {
      filename,
      base: basename(filename),
      exports,
      dir: dirname(filename),
      sideEffects,
      code: "",
      files: [],
      resources: {},
    };
    const filter = /.*/;
    const config = Object.assign({}, this.config, {
      entryPoints: [exports ? "@exports" : filename],
      minify: mode === "production",
      format: globalName ? "iife" : "esm",
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

  resolve({ path, resolveDir }) {
    switch (path) {
      case name:
        return { path: "vistta", namespace: "window" };
      case "@content":
        return { path: "content", external: true };
      case "@socket":
        return { path: "socket", external: true };
      case "@exports":
        return { path: this.base, namespace: "exports" };
      default:
        break;
    }
    return resolve(path, { parentURL: resolveDir, bundler: true }, (final, { builtin, file }) => {
      if (builtin) return { path: final, namespace: "ignore" };
      if (file) return { path: final, sideEffects: this.sideEffects };
      return {};
    });
  }

  load({ path, namespace }) {
    if (namespace === "ignore") return { contents: "" };
    if (namespace === "window") return { contents: `module.exports = window.${path};` };
    if (namespace === "exports")
      return {
        contents: `export { ${this.exports} } from "./${this.base}";`,
        resolveDir: this.dir,
      };
    const { source, resources, files = [] } = load(path, { bundler: true }, () => ({}));
    this.files.push(...files);
    if (!source) return { loader: "js" };
    resources?.forEach(({ hash, path, code, compiler }) => (this.resources[hash] = path || code || compiler));
    return { contents: source, loader: "js" };
  }
}

const resolveImports = async (filepath, _imports = new Set()) => {
  const imports = (await fs.readFile(filepath, "utf-8"))?.match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/g);
  for (let i = 0, len = imports?.length; i < len; i++) {
    const matches = imports[i].match(/import\s+[^'"]+\s+from\s+['"]([^'"]+)['"]/);
    if (!matches?.[1]) continue;
    const dirname = fs.dirname(filepath);
    const path = resolve(fs.resolve(dirname, matches[1]), { parentURL: dirname, bundler: true }, (final) => final);
    if (!fs.existsSync(path)) continue;
    _imports.add(path);
    await resolveImports(path, _imports);
  }
  return Array.from(_imports);
};

const bundle = ((b) => b.run.bind(b))(new Bundler());

export { bundle, resolveImports };
export default Bundler;
