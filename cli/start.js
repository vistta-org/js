import { default as DefaultCLI } from "./default.js";
import fs from "@vistta/fs";
import { trim } from "../utils/index.js";

const dirname = fs.dirname(import.meta.url);

export default class extends DefaultCLI {
  routes = new console.Console("routes", { index: 1 });
  counter = { page: [], api: [] };

  async main(_, ...args) {
    if (process.env.NODE_ENV === "development") await this.outdated();
    const Server = (await import(fs.resolve(dirname, "../server/index.js"))).default;
    const jsPackage = (await import(fs.resolve(dirname, "../package.json"))).default;
    system.clear();
    system.announce(`Vistta JS v${jsPackage.version}`);
    console.println();
    const options = {}; // TODO: Import options from package
    const folder = args.shift() || options.folder;
    if (!folder) throw new Error(`Missing main folder. Either define it as an argument or on the package json.`);
    for (let i = 0, len = args?.length; i < len; i++) {
      let [key, value] = args[i].split(/=(.*)/s, 2);
      if (key.startsWith("--")) key = key.slice(2);
      if (key.startsWith("-")) key = key.slice(1);
      options[key] = trim(value);
    }
    options.http ||= (process.env.NODE_ENV === "development" ? 3000 : 80);
    options.https ||= (process.env.NODE_ENV === "development" ? null : 443);

    new Server(folder, options, (err, { message, pathname, port } = {}) => {
      if (err) return console.error(err?.stack);
      switch (message) {
        case "http ready":
          this.routes.time("routes");
          return system.log(`http://localhost:${port}`);
        case "https ready":
          this.routes.time("routes");
          return system.log(`https://localhost:${port}`);
        case "page ready":
          if (this.counter.page.includes(pathname)) break;
          this.counter.page.push(pathname);
          this.routes.clear();
          this.routes.timeLog(
            "routes",
            `Loaded ${this.counter.page.length} page(s), ${this.counter.api.length} API(s).`
          );
          break;
        case "api ready":
          if (this.counter.api.includes(pathname)) break;
          this.counter.api.push(pathname);
          this.routes.clear();
          this.routes.timeLog(
            "routes",
            `Loaded ${this.counter.page.length} page(s), ${this.counter.api.length} API(s).`
          );
          break;
      }
    });
  }
}