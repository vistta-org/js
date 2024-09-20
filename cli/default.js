import { default as DefaultCLI } from "@vistta/cli/default";
import fs from "@vistta/fs";
import { setupServerEnvironment } from "../utils/index.js";

const dirname = fs.dirname(import.meta.url);

export default class extends DefaultCLI {
  constructor(options) {
    super(options);
    this.define("window", setupServerEnvironment(global));
    this.register(fs.resolve(dirname, "./loaders/file.js"), "*");
    this.register(fs.resolve(dirname, "./loaders/file.js"), "reader");
    this.register(fs.resolve(dirname, "./loaders/jsx.js"), "*", ["jsx", "mjsx", "cjsx", "tsx", "mtsx", "ctsx"], true);
    this.register(fs.resolve(dirname, "./loaders/api.js"), "api", ["js", "mjs", "cjs", "ts", "mts", "cts"]);
    this.register(fs.resolve(dirname, "./loaders/style.js"), "*", ["css", "sass", "scss"]);
    this.register(fs.resolve(dirname, "./loaders/template.js"), "template");
  }
}