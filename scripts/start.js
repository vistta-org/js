import Server, { fs } from "../server/index.js";
import { trim, capitalize } from "../utils/index.js";
console.announce(`VisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const options = await (async (args) => {
  const config = (await import(fs.resolve("./package.json"))).default?.["vistta-config"] || {};
  const folder = args.shift() || config.folder;
  if (!folder) return abort(`Missing main folder. Either define it as an argument or on the package.`);
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
  callback: ({ pathname, event, type }) => {
    if (event === "modified") {
      return logs[pathname]?.update(`${capitalize(type)} "${pathname}" ${console.code.magenta}modified.`);
    }
    if (event === "ready") {
      if (logs[pathname]) logs[pathname].update(`${capitalize(type)} "${pathname}" ${console.code.green}ready.`);
      else logs[pathname] = console.log(`${capitalize(type)} "${pathname}" ${console.code.green}ready.`);
    }
  },
});
