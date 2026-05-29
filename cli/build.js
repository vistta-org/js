import { parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";
import { assign } from "@vistta/utils";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class BuildCommand extends DefaultCommand {
  async help() {
    console.print("Vistta JS Build CLI");
    console.print("\nUsage:");
    console.print("vistta build [folder]\t\t\t\tBuilds the specified folder into static web page files.");
    console.print("vistta build [folder] app\t\t\tBuilds for all platforms into [folder]/build.");
    console.print("vistta build [folder] android\t\t\tBuilds for Android into [folder]/build.");
    console.print("vistta build [folder] ios\t\t\tBuilds for iOS into [folder]/build.");
    console.print("vistta build [folder] desktop\t\t\tBuilds for desktop into [folder]/build.");
    console.print("\nOptions:");
    console.print("--no-clean\t\t\t\t\tDisable output directory cleanup.");
    console.print("--out [dir]\t\t\t\t\t\tSpecify custom output directory.");
    console.print("--setup [module]\t\t\t\t\tSpecify a custom setup module to run before building the app.");
  }

  async main(_, ...argv) {
    const [[folder, target], options] = parseArgs(argv);
    if (!(folder?.length > 0)) return this.help();
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    console.print(`Vistta JS v${version}`);
    console.println();

    const outputDir = options.out || fs.resolve(process.cwd(), "dist");
    if (!options["no-clean"]) await fs.remove(outputDir);
    const buildApp = ["app", "android", "ios", "desktop"].includes(target);

    console.time("build");
    const Builder = (await import("../builder.js")).default;
    let { config, routes, files } = await Builder.build(fs.resolve(process.cwd(), folder), {
      type: buildApp ? "app" : "web",
      output: buildApp ? fs.resolve(outputDir, "wwww") : outputDir,
      config: assign(
        options.setup ? (await (await import(fs.resolve(process.cwd(), options.setup))).default?.()) || {} : {},
        buildApp
          ? {
              csp: {
                "default-src": "ipc: http://ipc.localhost",
                "connect-src": "'self' ipc: http://ipc.localhost https: wss:",
                "img-src": "data: http: https:",
              },
            }
          : {},
      ),
    });
    if (buildApp) {
      let runtime;
      try {
        runtime = await import("@vistta/js-runtime");
      } catch {
        throw new Error(
          "Missing dependency: @vistta/js-runtime. Please run `npm install @vistta/js-runtime` to install it.",
        );
      }
      config.buildDir = outputDir;
      if (target === "app") {
        await runtime.build(/** @type {any} */ ({ target: "desktop", ...config }));
        await runtime.build(/** @type {any} */ ({ target: "android", ...config }));
        await runtime.build(/** @type {any} */ ({ target: "ios", ...config }));
      } else await runtime.build(/** @type {any} */ ({ target, ...config }));
    }
    console.timeLog("build", `Built ${routes.length} route(s), ${files.length} file(s)`);
  }
}
