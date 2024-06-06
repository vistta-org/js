process.env.BUILD = true;
import Server from "../server/index.js";
import fs from "@vistta/fs";
const HTML = "/index.html";
const SCRIPT = "/script.js";
const STYLESHEET = "/style.css";
console.clear();
console.announce(`\tVisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const config = (await import(fs.resolve("./package.json"))).default || {};
const main = process.argv?.slice(2)?.shift() || config.folder;
const output = process.argv?.slice(3)?.shift() || config.output;
if (!main || !fs.existsSync(main))
  abort(
    `Missing main folder. Either define it as an argument or on the package json.`,
  );
if (!output)
  abort(
    `Missing output folder. Either define it as an argument or on the package json.`,
  );
await createDirectory(output);
const build = new console.Console("build", {
  date: false,
  trace: process.env.CONSOLE_TRACE,
});
build.time("build");
const { pages, resources } = await new Server({
  build: true,
  trace: process.env.CONSOLE_TRACE,
}).build(main);
const files = Object.keys(pages);
const max = Math.max(...files.map((file) => file.length + HTML.length));
build.log(`┌ Routes${" ".repeat(max - 6)}\tSize`);
for (let i = 0, len = files.length; i < len; i++) {
  const page = pages[files[i]];
  const dirname = fs.resolve(output + files[i]);
  const len = files[i].length;
  await createDirectory(dirname);
  build.timeLog(
    "build",
    `├ ${formatDisplayPath(files[i]) + " ".repeat(max - len)}\t\t\t`,
  );
  await fs.writeFile(dirname + HTML, page.render());
  build.timeLog(
    "build",
    `│ ${" ".repeat(len - 1) + HTML + " ".repeat(max - len - HTML.length)}\t${formatFileSize(fs.statSync(dirname + HTML).size)}\t`,
  );
  await fs.writeFile(dirname + SCRIPT, page.script());
  build.timeLog(
    "build",
    `│ ${" ".repeat(len - 1) + SCRIPT + " ".repeat(max - len - SCRIPT.length)}\t${formatFileSize(fs.statSync(dirname + SCRIPT).size)}\t`,
  );
  const stylesheet = page.stylesheet();
  if (stylesheet.length == 0) continue;
  await fs.writeFile(dirname + STYLESHEET, stylesheet);
  build.timeLog(
    "build",
    `│ ${" ".repeat(len - 1) + STYLESHEET + " ".repeat(max - len - STYLESHEET.length)}\t${formatFileSize(fs.statSync(dirname + STYLESHEET).size)}\t`,
  );
}
build.timeLog("build", "└ Done");
// Page Resources
const resourceFiles = Object.keys(resources);
if (resourceFiles.length) {
  const dirname = fs.resolve(output, "resources");
  if (!fs.existsSync(dirname)) fs.mkdir(dirname);
  for (let i = 0, len = resourceFiles.length; i < len; i++) {
    const filename = resourceFiles[i];
    const content = resources[filename];
    if (fs.existsSync(content))
      await fs.copyFile(content, fs.resolve(dirname, filename));
    else
      await fs.writeFile(
        fs.resolve(dirname, filename),
        typeof content === "function" ? content() : content?.toString(),
      );
  }
}

//

function formatFileSize(size) {
  const units = ["B  ", "KiB", "MiB", "GiB"];
  let power = 0;
  while (size > 1024 && power < units.length - 1) {
    size /= 1024;
    power += 1;
  }
  const spaces = Math.max(0, 4 - Math.floor(size).toString().length);
  return `${" ".repeat(spaces)}${size.toFixed(2)} ${units[power]}`;
}

function formatDisplayPath(path) {
  if (path === "/") return path;
  if (path.endsWith("/")) return path.slice(0, -1);
  return path;
}

async function createDirectory(path) {
  if (fs.existsSync(path)) return;
  await fs.mkdir(path, { recursive: true });
  createDirectory(path);
}
