import Server, { fs } from "../server/index.js";
console.announce(`VisttaJS v${process.env.APP_VERSION}`);
const abort = (error) => (console.error(error), process.exit(0));
const config = (await import(fs.resolve("./package.json"))).default || {};
const main = process.argv?.slice(2)?.shift() || config.folder;
const output = process.argv?.slice(3)?.shift() || config.output;
if (!main || !fs.existsSync(main)) abort(`Missing main folder. Either define it as an argument or on the package json.`);
if (!output) abort(`Missing output folder. Either define it as an argument or on the package json.`);
if (!fs.existsSync(output)) fs.mkdir(output);
const { pages, resources } = await new Server({ build: true }).build(main);
const files = Object.keys(pages);
for (let i = 0, len = files.length; i < len; i++) {
  const filepath = fs.resolve(output + files[i]);
  const page = pages[files[i]];
  const dirname = fs.dirname(filepath);
  if (!fs.existsSync(dirname)) fs.mkdir(dirname);
  await fs.writeFile(filepath, page.template);
  console.log(`"${page.pathname}" ${console.code.green}ready.`);
}
// Page Resources
const resourceFiles = Object.keys(resources);
if (resourceFiles.length) {
  const dirname = fs.resolve(output, "resources");
  if (!fs.existsSync(dirname)) fs.mkdir(dirname);
  for (let i = 0, len = resourceFiles.length; i < len; i++) {
    const filename = resourceFiles[i];
    const content = resources[filename];
    switch (typeof content) {
      case "string":
        await fs.copyFile(content, fs.resolve(dirname, filename));
        break;
      case "function":
        await fs.writeFile(fs.resolve(dirname, filename), content());
        break;
      default:
        break;
    }
  }
}
console.log(`Project compiled.`);
