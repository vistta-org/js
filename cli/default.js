import { DefaultCommand, parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";

const dirname = import.meta.dirname;

export default class extends DefaultCommand {
  constructor() {
    super();
    this.register(fs.resolve(dirname, "./loaders/file.js"));
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "reader" });
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "url" });
    this.register(fs.resolve(dirname, "./loaders/jsx.js"), { filter: ".*\\.(jsx|mjsx|cjsx|tsx|mtsx|ctsx)" });
    this.register(fs.resolve(dirname, "./loaders/api.js"), { type: "api" });
    this.register(fs.resolve(dirname, "./loaders/style.js"), { filter: ".*\\.css" });
    this.register(fs.resolve(dirname, "./loaders/template.js"), { type: "template" });
    this.resolve("jsx", "tsx");
  }

  async main(...argv) {
    const [[file]] = parseArgs(argv);
    if (process.env.NODE_ENV === "development") await this.outdated();
    const filepath = fs.resolve(process.cwd(), file);
    if (!fs.existsSync(filepath)) {
      console.print(`Unknown command/script "${file}"\n`);
      return this.help();
    }
    import(filepath);
  }
}
