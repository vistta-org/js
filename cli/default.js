import { default as DefaultCLI } from "@vistta/cli/default";
import fs from "@vistta/fs";

const dirname = import.meta.dirname;

export default class extends DefaultCLI {
  constructor(options) {
    super(options);
    this.register(fs.resolve(dirname, "./loaders/file.js"), "File", "*");
    this.register(fs.resolve(dirname, "./loaders/file.js"), "File", "reader");
    this.register(fs.resolve(dirname, "./loaders/jsx.js"), "JSX", "*", ["jsx", "mjsx", "cjsx", "tsx", "mtsx", "ctsx"], true);
    this.register(fs.resolve(dirname, "./loaders/api.js"), "API", "api", ["js", "mjs", "cjs", "ts", "mts", "cts"]);
    this.register(fs.resolve(dirname, "./loaders/style.js"), "Style", "*", ["css", "sass", "scss"]);
    this.register(fs.resolve(dirname, "./loaders/template.js"), "Template", "template");
  }

  async main(...argv) {
    const [[file], options] = this.parse(argv);
    if (process.env.NODE_ENV === "development") await this.outdated();
    const filepath = fs.resolve(process.cwd(), file);
    if (!fs.existsSync(filepath)) {
      console.print(`Unknown command/script "${file}"\n`);
      return this.help();
    }
    if(options.app) this.app(filepath);
    else import(filepath);
  }

  async app(filepath) {
    const electronPath = (await import("electron"))?.default;
    const { spawn } = await import("node:child_process");
    const child = spawn(electronPath, [filepath], { stdio: 'inherit', windowsHide: false });
    child.on('close', async(code, signal) => {
      if (code === null) {
        console.error(electronPath, 'exited with signal', signal);
        process.exit(1);
      }
      process.exit(code);
    });
    process.on('SIGINT', () => !child.killed && child.kill('SIGINT'));
    process.on('SIGTERM', () => !child.killed && child.kill('SIGTERM'));
  }
}