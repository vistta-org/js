import Server from "../server/index.js";
import puppeteer from 'puppeteer';
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { sleep } from "@vistta/utils/core";
import { URL } from "node:url";
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
  await Promise.all([
    _page.coverage.startJSCoverage(),
    _page.coverage.startCSSCoverage(),
  ]);
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
    },
    coverage: async () => {
      const [jsCoverage, cssCoverage] = await Promise.all([
        _page.coverage.stopJSCoverage(),
        _page.coverage.stopCSSCoverage(),
      ]);
      const total = { covered: 0, length: 0 }
      const report = [...jsCoverage, ...cssCoverage].map(({ url, ranges, text }) => {
        let coverage = 0;
        for (const range of ranges) coverage += range.end - range.start - 1;
        total.length += text.length;
        total.covered += coverage;
        return { name: new URL(url).pathname.replace(/.*\/resources/, "/resources"), coverage: `${(coverage / text.length) * 100}%` }
      });
      report.push({ name: "total", coverage: `${(total.covered / total.length) * 100}%` })
      console.table(report);
    }
  }
})(await puppeteer.launch({
  headless: !!process.env.CI
}));
const unique = new Set();

if (!process.env.DEBUG) describe("VisttaJS Unit Tests", () => {
  after(async () => {
    await page.coverage();
    await sleep(500);
    process.exit();
  });
  Object.keys(specs).forEach((spec) => Object.keys(specs[spec]).forEach((test) => {
    if (!unique.has(test)) unique.add(test);
    else throw "Duplicated Test Key";
    it(test, async () => {
      await page.navigate(BASE_URL + encodeURIComponent(test));
      await specs[spec][test].test(page, assert, app);
    })
  }));
});