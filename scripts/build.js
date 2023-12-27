import Server from "../server/index.js";
import { fs, Console } from "@vistta/utils";
const HTML = "/index.html";
const SCRIPT = "/script.js";
// eslint-disable-next-line no-global-assign
console = new Console("");
const system = new Console("system", { date: false, fixed: "\n", message: Console.isTTY ? { before: "\t" } : undefined });
system.announce(`VisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const config = (await import(fs.resolve("./package.json"))).default || {};
const main = process.argv?.slice(2)?.shift() || config.folder;
const output = process.argv?.slice(3)?.shift() || config.output;
if (!main || !fs.existsSync(main)) abort(`Missing main folder. Either define it as an argument or on the package json.`);
if (!output) abort(`Missing output folder. Either define it as an argument or on the package json.`);
if (!fs.existsSync(output)) fs.mkdir(output);
const build = new Console("build", { date: false });
build.time("build");
const { pages, resources } = await new Server({ build: true }).build(main);
const files = Object.keys(pages);
const max = Math.max(...files.map(file => file.length + HTML.length));
build.log(`┌ Routes${" ".repeat(max - 6)}\tSize`)
for (let i = 0, len = files.length; i < len; i++) {
  const page = pages[files[i]];
  const dirname = fs.resolve(output + files[i]);
  const len = files[i].length;
  if (!fs.existsSync(dirname)) fs.mkdir(dirname);
  build.timeLog("build", `├ ${files[i] + " ".repeat(max - len)}\t\t`);
  await fs.writeFile(dirname + HTML, page.html);
  build.timeLog("build", `│ ${" ".repeat(len - 1) + HTML + " ".repeat(max - len - HTML.length)}\t${fs.statSync(dirname + HTML).size} B\t`);
  await fs.writeFile(dirname + SCRIPT, page.script);
  build.timeLog("build", `│ ${" ".repeat(len - 1) + SCRIPT + " ".repeat(max - len - SCRIPT.length)}\t${fs.statSync(dirname + SCRIPT).size} B\t`);
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
    if (fs.existsSync(content)) await fs.copyFile(content, fs.resolve(dirname, filename));
    else await fs.writeFile(fs.resolve(dirname, filename), typeof content === "function" ? content() : content?.toString());
  }
}