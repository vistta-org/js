import fs from "@vistta/fs";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class extends DefaultCommand {
  async help() {
    console.print("Runs all the tests files that match the pattern/s in the current project");
    console.print("\nUsage:");
    console.print("vistta test [...patterns]\tRuns all the tests files that match the pattern/s in the current project");
    console.print(
      'vistta test --filter="pattern"\tRuns all the tests that match the filter pattern/s in the current project',
    );
    console.print("vistta test --only\tRuns all the tests that have the only");
  }

  async main(_, ...argv) {
    let Electron;
    try {
      Electron = (await import("@vistta/js-runtime")).Electron;
    } catch {
      throw new Error("Missing dependency: @vistta/js-runtime. Please run `npm install @vistta/js-runtime` to install it.");
    }

    const keys = Object.keys(process.vistta || {});
    for (let i = 0, len = keys.length; i < len; i++)
      process.env[`vistta_${keys[i]}`.toUpperCase()] = JSON.stringify(process.vistta[keys[i]]);
    const child = Electron.exec([fs.resolve(dirname, "../tests/runner.js"), ...argv], {
      stdio: "inherit",
      windowsHide: false,
    });
    child.on("close", (code, signal) => {
      if (code === null) {
        console.error("Electron", "exited with signal", signal);
        process.exit(1);
      }
      process.exit(code);
    });
    process.on("SIGINT", () => !child.killed && child.kill("SIGINT"));
    process.on("SIGTERM", () => !child.killed && child.kill("SIGTERM"));
  }
}
