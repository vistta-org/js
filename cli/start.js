import { default as DefaultCLI } from "./default.js";
import fs from "@vistta/fs";

const dirname = import.meta.dirname;

export default class extends DefaultCLI {
  #announcer;

  help() {
    console.print("Start a Vistta JS web server or desktop application.");
    console.print("\nUsage:");
    console.print("vistta start [folder]\tStart a web server using the specified folder as the router.");
    console.print("vistta start server [folder]\tStart a web server using the specified folder as the router.");
    console.print("vistta start app [file]\tStart a Vistta JS application.");
    console.print("Options for web server:");
    console.print("--http\tPort for HTTP server. Default is 80/3000.");
    console.print("--https\tPort for HTTPS server. Default is 443.");
  }

  async main(_, ...argv) {
    const [args, options] = this.parse(argv);
    if (args.length === 0) return this.help();
    if (args.length === 1) args.unshift("server");
    const [type, entry] = args;
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    this.#announcer = console.print(`Vistta JS v${version}`);
    console.println();
    if (type === "server") await this.server(entry, options);
    else if (type === "app") await this.app(entry, options);
    else return this.help();
  }

  async server(entry, options) {
    const Server = (await import(fs.resolve(dirname, "../server/index.js")))?.default;
    options.http ||= (process.env.NODE_ENV === "development" ? 3000 : 80);
    options.https ||= (process.env.NODE_ENV === "development" ? null : 443);

    const counter = { page: [], api: [] };
    const server = new Server(entry, options);
    server.on("warning", console.warn);
    server.on("error", ({ stack }) => console.error(stack));
    server.on("ready", ({ type, port, pathname}) => {
      switch (type) {
        case "http":
        case "https":
          console.time("routes");
          return this.#announcer.replace((_, data) => [...data, `\n${type}://localhost:${port}`]);
        case "page":
          if (counter.page.includes(pathname)) break;
          counter.page.push(pathname);
          if (counter.log) counter.log.replace(`Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          else counter.log = console.timeLog(
            "routes",
            `Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`
          );
          break;
        case "api":
          if (counter.api.includes(pathname)) break;
          counter.api.push(pathname);
          if (counter.log) counter.log.replace(`Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`);
          else counter.log = console.timeLog(
            "routes",
            `Loaded ${counter.page.length} page(s), ${counter.api.length} API(s).`
          );
          break;
      }
    });
  }

  async app(entry) {
    const { spawn } = await import("node:child_process");
    const electron = (await import("electron"))?.default;
    const { Bundler } = await import("@vistta/cli");
    entry = fs.resolve(process.cwd(), entry);
    const build = entry.replace(new RegExp(`${fs.extname(entry)}$`), ".build.js");
    await fs.writeFile(build, (await new Bundler().run(entry, {
      define: { "process.platform": JSON.stringify(process.platform) },
      platform: "node",
      write: false,
    }))?.code);

    const child = spawn(electron, [fs.resolve(dirname, "../app/index.js"), build], {
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('close', async(code, signal) => {
        if (code === null) {
            console.error(electron, 'exited with signal', signal);
            process.exit(1);
        }
        process.exit(code);
    });

    process.on('SIGINT', async() => {
        if (!child.killed) child.kill('SIGINT');
    });

    process.on('SIGTERM', async() => {
        if (!child.killed) child.kill('SIGTERM');
    });
  }
}