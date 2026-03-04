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
    super.app(fs.resolve(dirname, "../tests/runner.js"), ...argv);
  }
}
