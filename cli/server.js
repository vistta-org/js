import { COLORS } from "@vistta/console";
import fs from "@vistta/fs";
import Server from "../server/index.js";
import { default as DefaultCLI } from "./default.js";

const dirname = import.meta.dirname;

export default class extends DefaultCLI {
  #announcer;

  help(command) {
    console.print("Vistta JS Server CLI");
    console.print("\nUsage:");
    switch (command) {
      default:
        console.print("vistta server start [folder]\tStart a web server using the specified folder as the router.");
        console.print("vistta server build [folder]\tBuilds the specified folder into a static web page files.");
        break;
      case "start":
        console.print("vistta server start [folder]\tStart a web server using the specified folder as the router.");
        console.print("Options:");
        console.print("--http\tPort for HTTP server. Default is 80/3000.");
        console.print("--https\tPort for HTTPS server. Default is 443.");
        break;
      case "build":
        console.print("vistta server build [folder]\tBuilds the specified folder into a static web page files.");
        break;
    }
  }

  async main(_, ...argv) {
    const [args, options] = this.parse(argv);
    const [command, folder, output] = args;
    if (args.length === 0) return this.help();
    if (command === "start") await this.start(folder, options);
    else if (command === "build") await this.build(folder, output, options);
    else this.help();
  }

  async start(folder, options) {
    if (!(folder?.length > 0)) return this.help("start");
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
    server.on("error", ({ stack }) => console.error(stack));
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

  async build(folder, output = "dist", options) {
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

/*
import pkg from "../../package.json";
import Server from "../index.js";
system.clear();
system.announce(`Vistta JS v${pkg.version}`);
console.println();
const args = process.argv.slice(2);
const build = new console.Console("build", { index: 1 });
const options = {}; // TODO: Import options from package
const folder = args.shift() || options.folder;
const output = args.shift() || options.output;
if (!folder)
  throw new Error(
    `Missing main folder. Either define it as an argument or on the package json.`
  );

build.log(`┌ Files`);
build.time("build");
await new Server(folder, { build: output }, (_, file, size) =>
  build.timeLog(
    "build",
    `├ ${formatDisplayPath(file)} - ${formatFileSize(size)}`
  )
);
build.timeLog("build", "└ Done");

function formatFileSize(size) {
  const units = ["B", "KiB", "MiB", "GiB"];
  let power = 0;
  while (size > 1024 && power < units.length - 1) {
    size /= 1024;
    power += 1;
  }
  return `${size.toFixed(2)} ${units[power]}`;
}

function formatDisplayPath(path) {
  if (path === "/") return path;
  if (path.endsWith("/")) return path.slice(0, -1);
  return path;
}
*/
