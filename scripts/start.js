import Server, { fs } from "../server/index.js";
import { trim, capitalize } from "../utils/index.js";
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
app.use(options.folder, "/", {
  callback: (event, pathname, type, ...args) => {
    if (!logs[pathname]) logs[pathname] = new Console(pathname);
    if (event === "error") return logs[pathname].error(...args);
    logs[pathname].clear();
    logs[pathname].log(`${capitalize(type)} "${pathname}" ${event === "ready" ? Console.green : Console.magenta}${event}.`);
  },
});
