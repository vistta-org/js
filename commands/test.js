import { DefaultCommand } from "@vistta/cli";
import fs from "@vistta/fs";
import { sleep } from "@vistta/utils";
import { randomBytes } from "crypto";
import { URL } from "node:url";
import puppeteer from "puppeteer";

const DEFAULT_PORT = 1246;
const dirname = import.meta.dirname;
const server = {};

export default class extends DefaultCommand {
  constructor(options) {
    super(options);
    this.register(fs.resolve(dirname, "./loaders/file.js"));
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "reader" });
    this.register(fs.resolve(dirname, "./loaders/file.js"), { type: "url" });
    this.register(fs.resolve(dirname, "./loaders/jsx.js"), { filter: ".*\\.(jsx|mjsx|cjsx|tsx|mtsx|ctsx)" });
    this.register(fs.resolve(dirname, "./loaders/api.js"), { type: "api" });
    this.register(fs.resolve(dirname, "./loaders/style.js"), { filter: ".*\\.(css|sass|scss)" });
    this.register(fs.resolve(dirname, "./loaders/template.js"), { type: "template" });
    this.define("global", "browser", {
      mount: async (filepath, options) => {
        await startServer();
        const id = randomBytes(6).toString("hex");
        await server.instance.use(id, "/", fs.resolve(process.cwd(), filepath));
        return await page(`http://${id}.localhost:${DEFAULT_PORT}/`, options);
      },
      open: async (url, options) => {
        return await page(url, options);
      },
    });
  }
}

async function startServer() {
  if (server.status === "ready") return;
  if (server.status === "loading") {
    const awaitStatus = (resolve) => {
      if (server.status === "ready") resolve();
      else setTimeout(() => awaitStatus(resolve), 100);
    };
    return new Promise(awaitStatus);
  }
  server.status = "loading";
  const Server = (await import(fs.resolve(dirname, "../server/index.js"))).default;
  server.instance = new Server({ http: DEFAULT_PORT, strict: false, start: true });
  server.status = "ready";
}

async function page(url, options) {
  const page = await (
    await puppeteer.launch({
      headless: !process.env.NODE_DEBUG,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: ["--no-sandbox"],
      ...options,
    })
  ).newPage();
  await page.goto(url);
  page.navigate = async (url) => await page.goto(url);
  page.get = async (selector, arg1, arg2) => {
    if (typeof arg1 === "string") return await (await element(page, selector, arg2)).get(arg1);
    else return await element(page, selector, arg1);
  };
  page.wait = async (delay) => await sleep(delay);
  page.press = async (selector, key, options) => await (await element(page, selector)).press(key, options);
  page.type = async (selector, text, options) => await (await element(page, selector)).type(text, options);
  page.location = async () => new URL(await page.url());
  page.dimensions = () =>
    page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }));
  return page;
}

async function element(page, selector, options) {
  const element = options?.wait ? await page.waitForSelector(selector, options) : await page.$(selector);
  if (!element) return null;
  element.get = async (property) => await (await element.getProperty(property)).jsonValue();
  element.wait = async (delay) => await sleep(delay);
  const type = element.type.bind(element);
  element.type = async (text, options) => {
    if (options?.clear) await element.evaluate((e) => (e.value = ""));
    await type(text, options);
    if (options?.submit !== false) await element.press("Enter");
  };
  return element;
}
