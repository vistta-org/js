import Server from "../server/index.js";
import { Console, fs } from "@vistta/utils";
import { trim, capitalize } from "../utils/index.js";
// eslint-disable-next-line no-global-assign
console = new Console("");
const system = new Console("system", { date: false, index: 0 });
system.announce(`\tVisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const options = await (async (args) => {
  const config = (await import(fs.resolve("./package.json"))).default || {};
  const folder = args.shift() || config.folder;
  if (!folder) return abort(`Missing main folder. Either define it as an argument or on the package json.`);
  for (let i = 0, len = args?.length; i < len; i++) {
    let [key, value] = args[i].split(/=(.*)/s, 2);
    if (key.startsWith("--")) key = key.slice(2);
    if (key.startsWith("-")) key = key.slice(1);
    config[key] = trim(value);
  }
  return {
    folder,
    http: config.http || (process.env.NODE_ENV === "development" ? 3000 : 8080),
    https: config.https || (process.env.NODE_ENV === "development" ? null : 8443),
    cert: config.cert,
    key: config.key,
  };
})(process.argv.slice(2));

const app = new Server({
  ...options,
  callback: ({ protocol, port }) =>
    system.log(`\t${protocol}://localhost:${port}`),
});

const context = {};
const routes = new Console("routes", { index: 1 });
routes.list = [];
routes.time("routes")
app.use(options.folder, "/", (event, pathname, type, ...args) => {
  const cur = type + pathname;
  if (!context[cur]) context[cur] = new Console(cur);
  switch (event) {
    case "error":
      return context[cur].error(...args);
    case "ready":
      context[cur].clear();
      if (routes.list.includes(pathname)) break;
      routes.list.push(pathname);
      routes.clear();
      routes.println();
      routes.timeLog("routes", `Loaded ${routes.list.length} routes.`);
      break;
    case "change":
      context[cur].clear();
      context[cur].log(`${capitalize(type)} "${pathname}" ${Console.magenta + "modified"}.`);
      break;
  }
});
