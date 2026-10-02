import { Bundler, parseArgs } from "@vistta/cli";
import { default as DefaultCommand } from "./default.js";

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
    let run;
    try {
      ({ run } = await import("@vistta/js-testing"));
    } catch {
      throw new Error(
        "Missing dependency: @vistta/js-testing. Please run `npm install -D @vistta/js-testing` to install it.",
      );
    }

    await run(argv, { Bundler, parseArgs });
  }
}
