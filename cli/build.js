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
    // console.print("vistta build [folder] ios\t\t\tBuilds for iOS into [folder]/build.");
    console.print("vistta build [folder] linux\t\t\tBuilds for Linux into [folder]/build.");
    console.print("vistta build [folder] windows\t\t\tBuilds for Windows into [folder]/build.");
    // console.print("vistta build [folder] macos\t\t\tBuilds for macOS into [folder]/build.");
    console.print("\nOptions:");
    console.print("--out [dir]\t\t\t\t\t\tSpecify custom output directory.");
    console.print("--build [dir]\t\t\t\t\t\tSpecify custom build directory.");
    console.print("--setup [module]\t\t\t\t\tSpecify a custom setup module to run before building the app.");
    console.print("--keystore-file [path]\t\t\tPath to an Android signing keystore. Overrides auto-generation.");
    console.print("--keystore-password [pass]\t\tPassword for the keystore and key. Requires --keystore-file.");
    console.print("--name [name]\t\t\t\tOverride the artifact base name (defaults to app name). Output is lowercased.");
    console.print(
      '--cross-compile [triples]\t\t\tCross-compile desktop target to one or more comma-separated Rust target triples (e.g. x86_64-pc-windows-gnu). In "app" mode the native desktop build runs first, then each cross-compile target.',
    );
  }

  async main(_, ...argv) {
    const [[folder, target], options] = parseArgs(argv);
    if (!(folder?.length > 0)) return this.help();
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    console.print(`Vistta JS v${version}`);
    console.println();

    const outputDir = fs.resolve(process.cwd(), options.out || "dist");
    const buildDir = fs.resolve(process.cwd(), options.build || "build");
    const buildApp = ["app", "android", "ios", "linux", "windows", "macos", "desktop"].includes(target);
    if (buildApp) await fs.remove(fs.resolve(buildDir, "www"), { force: true, recursive: true });

    console.time("build");
    const Builder = (await import("../builder.js")).default;
    let { config, routes, files } = await Builder.build(fs.resolve(process.cwd(), folder), {
      type: buildApp ? "app" : "web",
      output: buildApp ? fs.resolve(buildDir, "www") : outputDir,
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
      config.buildDir = buildDir;
      // --name: override the artifact base name (defaults to app.name).
      if (options.name) config.name = options.name;
      // --keystore-file / --keystore-password: use a pre-existing Android signing
      // keystore instead of auto-generating one. --keystore-file sets the path;
      // --keystore-password sets the password (otherwise falls back to env var).
      if (options["keystore-file"])
        config.keystore = options["keystore-password"]
          ? { file: fs.resolve(process.cwd(), options["keystore-file"]), password: options["keystore-password"] }
          : fs.resolve(process.cwd(), options["keystore-file"]);
      // Map platform targets to runtime targets. The runtime only knows
      // "desktop"/"android"/"ios". "windows" and "linux" map to "desktop";
      // "windows" sets crossCompile to the MinGW target. "macos" is not
      // supported yet (like "ios"). "desktop" is kept as a hidden alias for
      // backward compatibility — it builds for the host platform natively.
      const PLATFORM_MAP = {
        linux: { target: "desktop" },
        windows: { target: "desktop", crossCompile: "x86_64-pc-windows-gnu" },
        macos: { target: "desktop", crossCompile: "x86_64-apple-darwin" },
        desktop: { target: "desktop" },
        android: { target: "android" },
        ios: { target: "ios" },
      };
      // --cross-compile accepts a comma-separated list of Rust target triples
      // (e.g. "x86_64-pc-windows-gnu,aarch64-pc-windows-gnu"). Only applies to
      // the "desktop" runtime target in "app" mode: the native build runs
      // first, then each cross-compile target.
      const crossTargets = options["cross-compile"]
        ? String(options["cross-compile"])
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      // In "app" mode, build linux (native desktop) + windows (cross-compile) +
      // android. macos and ios are skipped (not supported on Linux).
      const targets = target === "app" ? ["linux", "windows", "android"] : [target];
      await fs.mkdir(outputDir, { recursive: true });
      const copied = [];
      const info = await runtime.getInfo(config);
      const appVersion = config?.app?.version || info.version;
      for (const t of targets) {
        const mapped = PLATFORM_MAP[t] || { target: t };
        // For "desktop" runtime target in "app" mode, build native + each
        // cross-compile target. For a single-target build with --cross-compile,
        // only the cross-compile targets are built (no native).
        const desktopVariants =
          mapped.target === "desktop"
            ? target === "app"
              ? [mapped.crossCompile || null, ...crossTargets]
              : crossTargets.length > 0
                ? crossTargets
                : [mapped.crossCompile || null]
            : [null];
        for (const ct of desktopVariants) {
          const buildConfig = { target: mapped.target, ...config };
          if (ct) buildConfig.crossCompile = ct;
          else delete buildConfig.crossCompile;
          let result;
          try {
            result = await runtime.build(/** @type {any} */ (buildConfig));
          } catch (err) {
            // Skip unsupported/unavailable platforms in "app" (all platforms) mode
            // rather than failing the entire build. Single-target builds still throw.
            if (targets.length > 1 || desktopVariants.length > 1) {
              const label = ct ? `${t} (${ct})` : t;
              console.print(`Skipping ${label}: ${err?.message || err}`);
              console.println();
              continue;
            }
            throw err;
          }
          const { type, paths } = result;
          for (const artifact of paths) {
            if (!artifact || !fs.existsSync(artifact)) continue;
            const name = runtime.artifactName({
              appName: config?.app?.name,
              name: config?.name,
              version: appVersion,
              type,
              sourcePath: artifact,
            });
            await fs.copyFile(artifact, fs.resolve(outputDir, name));
            copied.push(name);
          }
        }
      }
      console.timeLog("build", `Artifacts: ${copied.join(", ") || "none"}`);
    }
    console.timeLog("build", `Built ${routes.length} route(s), ${files.length} file(s)`);
  }
}
