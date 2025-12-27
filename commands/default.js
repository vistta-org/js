import { DefaultCommand, parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";

const dirname = import.meta.dirname;

export default class extends DefaultCommand {
  constructor(config) {
    super(config);
    this.register(fs.resolve(dirname, "./loaders/file.js"));
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "reader" });
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "url" });
    this.register(fs.resolve(dirname, "./loaders/jsx.js"), { filter: ".*\\.(jsx|mjsx|cjsx|tsx|mtsx|ctsx)" });
    this.register(fs.resolve(dirname, "./loaders/api.js"), { type: "api" });
    this.register(fs.resolve(dirname, "./loaders/style.js"), { filter: ".*\\.(css|sass|scss)" });
    this.register(fs.resolve(dirname, "./loaders/template.js"), { type: "template" });
    this.resolve("jsx", "tsx");
  }

  async main(...argv) {
    const [[file], options] = parseArgs(argv);
    if (process.env.NODE_ENV === "development") await this.outdated();
    const filepath = fs.resolve(process.cwd(), file);
    if (!fs.existsSync(filepath)) {
      console.print(`Unknown command/script "${file}"\n`);
      return this.help();
    }
    if (options.app) this.app(filepath);
    else import(filepath);
  }

  async app(...args) {
    const electronPath = (await import("electron"))?.default;
    const { spawn } = await import("node:child_process");
    const keys = Object.keys(process.vistta || {});
    for (let i = 0, len = keys.length; i < len; i++)
      process.env[`vistta_${keys[i]}`.toUpperCase()] = JSON.stringify(process.vistta[keys[i]]);
    const child = spawn(electronPath, args, { stdio: "inherit", windowsHide: false });
    child.on("close", async (code, signal) => {
      if (code === null) {
        console.error(electronPath, "exited with signal", signal);
        process.exit(1);
      }
      process.exit(code);
    });
    process.on("SIGINT", () => !child.killed && child.kill("SIGINT"));
    process.on("SIGTERM", () => !child.killed && child.kill("SIGTERM"));
  }
}
