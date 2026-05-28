import { parseArgs } from "@vistta/cli";
import fs from "@vistta/fs";
import { assign } from "@vistta/utils";
import { default as DefaultCommand } from "./default.js";

const APP_TARGETS = new Set(["android", "ios", "desktop"]);
const DEV = process.env.NODE_ENV === "development";

export default class extends DefaultCommand {
  async help() {
    console.print("Vistta JS Run CLI");
    console.print("\nUsage:");
    console.print(
      "vistta run [folder] [target]\tBuild + run native app for the specified platform. Default target: desktop.",
    );
    console.print("vistta run [folder] android\tBuild + launch on Android emulator/device.");
    console.print("vistta run [folder] ios\t\tBuild + launch on iOS simulator (macOS only).");
    console.print("vistta run [folder] desktop\t\tBuild + launch on desktop.");
    console.print("\nOptions:");
    console.print("--no-clean\t\t\tDisable output directory cleanup.");
    console.print("--out [dir]\t\t\tSpecify custom output directory (default: build).");
    console.print("--setup [module]\t\t\tSpecify a custom setup module to run before launching the app.");
  }

  async main(_, ...argv) {
    const [[folder, target = "desktop"], options] = parseArgs(argv);

    if (process.env.NODE_ENV === "development") await this.outdated();

    let runtime;
    try {
      runtime = await import("@vistta/js-runtime");
    } catch {
      throw new Error("Missing dependency: @vistta/js-runtime. Please run `npm install @vistta/js-runtime` to install it.");
    }

    if (!APP_TARGETS.has(target)) {
      console.print(`Invalid target "${target}". Use: ${[...APP_TARGETS].join(", ")}\n`);
      return this.help();
    }

    const folderPath = fs.resolve(process.cwd(), folder);
    if (!fs.existsSync(folderPath)) {
      console.print(`Folder "${folder}" not found.\n`);
      return this.help();
    }

    const buildDir = options.out || fs.resolve(process.cwd(), "build");
    if (!options["no-clean"]) await fs.remove(fs.resolve(buildDir, "www"), { force: true, recursive: true });

    console.time("run");
    const Builder = (await import("../builder.js")).default;
    const { config, routes, files } = await Builder.build(fs.resolve(process.cwd(), folder), {
      type: "app",
      output: fs.resolve(buildDir, "www"),
      config: assign(
        options.setup ? (await (await import(fs.resolve(process.cwd(), options.setup))).default?.()) || {} : {},
        {
          csp: {
            "default-src": "ipc: http://ipc.localhost",
            "connect-src": "'self' ipc: http://ipc.localhost https: wss:" + (DEV ? " ws: http:" : ""),
            "img-src": "data: http: https:",
          },
        },
      ),
    });
    config.target = target;
    config.buildDir = buildDir;
    await runtime.build(/** @type {any} */ (config));
    console.timeLog("run", `Launched ${target} app with ${routes?.length ?? 0} route(s) and ${files?.length ?? 0} file(s)`);
    const app = await runtime.run(/** @type {any} */ (config));
    app.on("close", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
    process.on("SIGINT", () => !app.killed && app.kill("SIGINT"));
    process.on("SIGTERM", () => !app.killed && app.kill("SIGTERM"));
  }
}
