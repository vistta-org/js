import { Bundler, parseArgs } from "@vistta/cli";
import NodeTestCommand from "@vistta/cli/test";
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
    console.print("vistta test --environment=node|browser\tSelects the runner (default: browser)");
  }

  async main(_, ...argv) {
    const [, options] = parseArgs(argv);
    const environment = options.environment ?? "browser";
    if (environment !== "node" && environment !== "browser") {
      throw new Error('Test environment must be "node" or "browser".');
    }
    if (environment === "node") return new NodeTestCommand().main(_, ...argv);
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
