import { parseArgs } from "@vistta/cli";
import { COLORS } from "@vistta/console";
import fs from "@vistta/fs";
import { default as DefaultCommand } from "./default.js";

const dirname = import.meta.dirname;

export default class ServeCommand extends DefaultCommand {
  #announcer;

  help() {
    console.print("Vistta JS Serve CLI");
    console.print("\nUsage:");
    console.print("vistta server start [folder]\tStart a web server using the specified folder as the router.");
    console.print("Options:");
    console.print("--http\tPort for HTTP server. Default is 80/3000.");
    console.print("--https\tPort for HTTPS server. Default is 443.");
  }

  async main(_, ...argv) {
    const Server = (await import("../web/server/index.js")).default;
    let [[folder], options] = parseArgs(argv);
    if (!(folder?.length > 0)) return this.help();
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    this.#announcer = console.print(`Vistta JS v${version}`);
    console.println();
    options.http ||= process.env.NODE_ENV === "development" ? 3000 : 80;
    options.https ||= process.env.NODE_ENV === "development" ? null : 443;
    const counter = { page: [], api: [] };
    const server = new Server(options);
    server.use("/", fs.resolve(process.cwd(), folder));
    server.on("warning", console.warn);
    server.on("error", (error) => console.error(error.trace || error.message || error));
    server.on("ready", ({ type, port, pathname }) => {
      switch (type) {
        case "http":
        case "https":
          console.time("routes");
          return this.#announcer.replace((_, data) => [...data, `\n${type}://localhost:${port}`]);
        case "page":
          if (counter.page.includes(pathname)) break;
          counter.page.push(pathname);
          if (counter.log) counter.log.replace(`Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          else
            counter.log = console.timeLog("routes", `Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          break;
        case "api":
          if (counter.api.includes(pathname)) break;
          counter.api.push(pathname);
          if (counter.log) counter.log.replace(`Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          else
            counter.log = console.timeLog("routes", `Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          break;
      }
    });
    server.on("request", ({ method, subdomain, url, status }) =>
      console.log(
        `${status >= 400 ? COLORS.RED : status >= 300 ? COLORS.DIM : COLORS.GREEN}${status}${COLORS.RESET} ${method}${subdomain !== "" ? " " + subdomain : ""} ${url}`,
      ),
    );
  }
}
