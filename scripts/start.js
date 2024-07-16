import pkg from "../package.json";
import Server from "../server/index.js";
import { trim } from "../utils/index.js";
system.clear();
system.announce(`Vistta JS v${pkg.version}`);
console.println();
const abort = (error) => (console.error(error), process.exit(0));
const options = await (async (args) => {
  const config = {};
  const folder = args.shift() || config.folder;
  if (!folder)
    return abort(
      `Missing main folder. Either define it as an argument or on the package json.`,
    );
  for (let i = 0, len = args?.length; i < len; i++) {
    let [key, value] = args[i].split(/=(.*)/s, 2);
    if (key.startsWith("--")) key = key.slice(2);
    if (key.startsWith("-")) key = key.slice(1);
    config[key] = trim(value);
  }
  return {
    folder,
    http: config.http || (process.env.NODE_ENV === "development" ? 3000 : 80),
    https:
      config.https || (process.env.NODE_ENV === "development" ? null : 443),
    cert: config.cert,
    key: config.key,
  };
})(process.argv.slice(2));

const app = new Server({
  ...options,
  callback: ({ protocol, port }) =>
    system.log(`${protocol}://localhost:${port}`),
});

const routes = new console.Console("routes", { index: 1 });
routes.list = [];
routes.time("routes");
app.use(options.folder, "/", (event, pathname, type, ...args) => {
  switch (event) {
    case "error":
      return console.error(...args);
    case "ready":
      if (routes.list.includes(pathname)) break;
      routes.list.push(pathname);
      routes.clear();
      routes.timeLog("routes", `Loaded ${routes.list.length} routes.`);
      break;
  }
});
