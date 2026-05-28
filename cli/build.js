import { parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class BuildCommand extends DefaultCommand {
  async help() {
    console.print("Vistta JS Build CLI");
    console.print("\nUsage:");
    console.print("vistta build [folder]\t\t\t\tBuilds the specified folder into static web page files.");
    console.print("vistta build [folder] app\t\t\tBuilds for all platforms into [folder]/build.");
    console.print("\nOptions:");
    console.print("--no-clean\t\t\t\t\tDisable output directory cleanup.");
    console.print("--out [dir]\t\t\t\t\t\tSpecify custom output directory.");
  }

  async main(_, ...argv) {
    const [[folder, target], options] = parseArgs(argv);
    if (!(folder?.length > 0)) return this.help();
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    console.print(`Vistta JS v${version}`);
    console.println();

    const outputDir = options.out || fs.resolve(process.cwd(), target === "app" ? "build" : "dist");
    if (!options["no-clean"]) await fs.remove(outputDir);

    console.time("build");
    const Builder = (await import("../builder.js")).default;
    let { routes, files } = await new Builder().build(fs.resolve(process.cwd(), folder), {
      type: target === "app" ? "app" : "web",
      output: outputDir,
    });
    console.timeLog("build", `Built ${routes.length} route(s), ${files.length} file(s)`);
  }
}
