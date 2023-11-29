import Server from "../server/index.js";
import { Console, fs } from "@vistta/utils";
import { trim, capitalize } from "../utils/index.js";
// eslint-disable-next-line no-global-assign
console = new Console("");
console.announce(`VisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const options = await (async (args) => {
  const config = (await import(fs.resolve("./package.json"))).default || {};
  const folder = args.shift() || config.folder;
  if (!folder) return abort(`Missing main folder. Either define it as an argument or on the package json.`);
  args.forEach((arg) => {
    let [key, value] = arg.split(/=(.*)/s, 2);
    if (key.startsWith("--")) key = key.slice(2);
    if (key.startsWith("-")) key = key.slice(1);
    config[key] = trim(value);
  });
  return {
    folder,
    http: config.http || 8080,
    https: config.https || 8443,
    cert: config.cert,
    key: config.key,
  };
})(process.argv.slice(2));

const app = new Server({
  ...options,
  callback: ({ protocol, port }) =>
    console.log(`${protocol.toUpperCase()} server app listen on ${protocol}://localhost:${port}`),
});

const logs = {};
app.use(options.folder, "/", (event, pathname, type, ...args) => {
  const cur = type + "/" + pathname;
  if (!logs[cur]) logs[cur] = new Console(cur);
  if (event === "error") return logs[cur].error(...args);
  logs[cur].clear();
  logs[cur].log(`${capitalize(type)} "${pathname}" ${event === "ready" ? Console.green : Console.magenta}${event === "change" ? "modified" : event}.`);
});
