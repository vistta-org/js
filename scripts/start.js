import Server, { fs, Console } from "../server/index.js";
import { trim, capitalize } from "../utils/index.js";
new Console(console);
console.announce(`VisttaJS v${process.env.VISION_VERSION}`);
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
    ports: { http: config.http || 8080, https: config.https || 8443 },
    certs: { cert: config.cert, key: config.key },
  };
})(process.argv.slice(2));

const app = new Server(options.ports, options.certs, ({ protocol, port }) =>
  console.log(`${protocol.toUpperCase()} server app listen on ${protocol}://localhost:${port}`)
);

console.time("page");
app.use(options.folder, "/", {
  callback: ({ pathname, event, type }) => {
    type = type !== "standard" ? type + " " : "";
    switch (event) {
      case "changed":
        return console.log(`${capitalize(type)}Page "${pathname}" was modified.`);
      case "refresh":
        return console.time(pathname);
      case "refreshed":
        return console.timeEnd(
          pathname,
          `${capitalize(type)}Page "${pathname}" ${console.code.cyan}refreshed${console.code.reset}`
        );
      case "compiled":
        return console.timeEnd(
          "page",
          `${capitalize(type)}Page "${pathname}" ${console.code.green}ready${console.code.reset}`
        );
    }
  },
});
