import pkg from "../package.json";
import Server from "../server/index.js";
system.clear();
system.announce(`Vistta JS v${pkg.version}`);
console.println();
const args = process.argv.slice(2);
const build = new console.Console("build", { index: 1 });
const options = {}; // TODO: Import options from package
const folder = args.shift() || options.folder;
const output = args.shift() || options.output;
if (!folder) throw new Error(`Missing main folder. Either define it as an argument or on the package json.`);

build.log(`┌ Files`);
build.time("build");
await new Server(folder, { build: output }, (_, file, size) => build.timeLog("build", `├ ${formatDisplayPath(file)} - ${formatFileSize(size)}`));
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