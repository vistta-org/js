import { resolve, load } from "@/bin/loaders";
import { build } from "esbuild";

class Bundler {
  config = {
    bundle: true,
    write: false,
    outdir: "out",
    legalComments: "none",
    keepNames: true,
    treeShaking: true,
    format: "esm",
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

  async run(filename, { mode = process.env.NODE_ENV } = {}) {
    const instance = { code: "", files: [], resources: {} };
    const filter = /.*/;
    const config = Object.assign({}, this.config, {
      entryPoints: [filename],
      minify: mode === "production",
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
      case "@vistta/visttajs":
        return { path: "vistta", namespace: "window" };
      case "@content":
        return { path: "content", external: true };
      case "@socket":
        return { path: "socket", external: true };
      default:
        break;
    }
    return resolve(path, { parentURL: resolveDir, bundler: true }, (final, { builtin, file }) => {
      if (builtin) return { path: final, namespace: "ignore" };
      if (file) return { path: final };
      return {};
    });
  }

  load({ path, namespace }) {
    if (namespace === "ignore") return { contents: "" };
    if (namespace === "window") return { contents: `module.exports = window.${path};` };
    const { source, resources, files = [] } = load(path, { bundler: true }, () => ({}));
    this.files.push(...files);
    if (!source) return { loader: "js" };
    resources?.forEach(({ hash, path, code, compiler }) => (this.resources[hash] = path || code || compiler));
    return { contents: source, loader: "js" };
  }
}

const bundle = ((b) => b.run.bind(b))(new Bundler());

export { bundle };
export default Bundler;
