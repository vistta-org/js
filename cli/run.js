import { parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class extends DefaultCommand {
  async help() {
    console.print("Vistta JS Run CLI");
    console.print("\nUsage:");
    console.print("vistta run [file]\tRun the specified file as a standalone application.");
  }

  async main(_, ...argv) {
    const [[file]] = parseArgs(argv);
    if (process.env.NODE_ENV === "development") await this.outdated();
    const filepath = fs.resolve(process.cwd(), file);
    if (!fs.existsSync(filepath)) {
      console.print(`Unknown command/script "${file}"\n`);
      return this.help();
    }
    super.app(fs.resolve(dirname, "../app/runner.js"), filepath);
  }
}
