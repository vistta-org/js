import Server from "../server/index.js";
import puppeteer from 'puppeteer';
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { sleep } from "@vistta/utils/core";
import * as specs from "./specs";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/`;
const app = await (new Promise((resolve, reject) => {
  const _app = new Server({ http: PORT, autoStart: true });
  _app.use("./tests", "/", (event, ...args) => {
    switch (event) {
      case "error":
        return reject(args);
      case "ready":
        return resolve(_app);
    }
  });
}));
const page = await (async (browser) => {
  const _page = (await browser.pages())?.[0] || await browser.newPage();
  await _page.goto(BASE_URL);
  return {
    navigate: (url) => _page.goto(url),
    sleep: (delay) => sleep(delay),
    click: (selector, options) => _page.click(selector, options),
    querySelector: async (selector, options) => {
      if (options?.wait) return await _page.waitForSelector(selector, options);
      return await _page.$(selector);
    },
    type: async (selector, value, options) => {
      await _page.click(selector);
      if (options?.clear) {
        await _page.keyboard.down("Control");
        await _page.keyboard.press("A");
        await _page.keyboard.up("Control");
        await _page.keyboard.press("Backspace");
      }
      await _page.keyboard.type(value);
      await _page.keyboard.press("Enter");
    }
  }
})(await puppeteer.launch({
  headless: !process.env.DEBUG,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
}));
const unique = new Set();

if (!process.env.DEBUG) describe("VisttaJS Unit Tests", () => {
  after(() => setTimeout(() => process.exit(), 500));
  Object.keys(specs).forEach((spec) => Object.keys(specs[spec]).forEach((test) => {
    if (!unique.has(test)) unique.add(test);
    else throw "Duplicated Test Key";
    it(test, async () => {
      await page.navigate(BASE_URL + encodeURIComponent(test));
      await specs[spec][test].test(page, assert, app);
    })
  }));
});