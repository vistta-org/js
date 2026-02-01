import { parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class BuildCommand extends DefaultCommand {
  help() {
    console.print("Vistta JS Build CLI");
    console.print("\nUsage:");
    console.print("vistta server build [folder]\tBuilds the specified folder into a static web page files.");
  }

  async main(_, ...argv) {
    const Server = (await import("../web/server/index.js")).default;
    let [[folder, output = "dist"], options] = parseArgs(argv);
    if (!(folder?.length > 0)) return this.help("build");
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    console.print(`Vistta JS v${version}`);
    console.println();
    const server = new Server({ ...options, http: true, start: false });
    await server.use("/", fs.resolve(process.cwd(), folder));
    console.print(await server.build(output));
  }
}
