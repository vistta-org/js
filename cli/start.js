import { default as DefaultCLI } from "./default.js";
import fs from "@vistta/fs";

const dirname = import.meta.dirname;

export default class extends DefaultCLI {
  #announcer;

  async main(_, ...argv) {
    const [[entry], options] = this.parse(argv);
    if (process.env.NODE_ENV === "development") await this.outdated();
    const { version } = (await import(fs.resolve(dirname, "../package.json"))).default;
    console.clear();
    this.#announcer = console.print(`Vistta JS v${version}`);
    console.println();
    if (!entry) throw new Error(`Missing main entry. Either define it as an argument.`);
    if(options.app) await this.app(entry, options);
    else await this.web(entry, options);
  }

  async web(entry, options) {
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

    /*
  async app(entry, options) {
    const { Bundler } = await import("@vistta/cli");
    const result = entry.replace(new RegExp(`${fs.extname(entry)}$`), ".app.js");
    await fs.writeFile(result, (await new Bundler().run({
      define: { "process.platform": JSON.stringify(process.platform) },
      filename: fs.resolve(process.cwd(), entry),
      platform: "node",
      write: false,
  }))?.code);
    import { spawn } from "node:child_process";
    import { tmpdir } from 'node:os';
    import electron from "electron";
    import fs from "@vistta/fs";
    import { Bundler } from '@vistta/cli';
    entry = fs.resolve(tmpdir(), `vistta_${Date.now()}.mjs`);
    const child = spawn(electron, [fs.resolve(dirname, "../../electron/adapter.js"), entry], { stdio: 'inherit', windowsHide: false });
    child.on("message", console.log);
    child.on('close', async(code, signal) => {
        await fs.unlink(entry);
        if (code === null) {
            console.error(electron, 'exited with signal', signal);
            process.exit(1);
        }
        process.exit(code);
    });
    process.on('SIGINT', async() => {
        await fs.unlink(entry);
        if (!child.killed) child.kill('SIGINT');
    });
    process.on('SIGTERM', async() => {
        await fs.unlink(entry);
        if (!child.killed) child.kill('SIGTERM');
    });

  }*/
}