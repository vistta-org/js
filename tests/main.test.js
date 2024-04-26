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
  await _page.goto(BASE_URL);
  const coverage = { active: false, reports: {} };
  return {
    navigate: async (url, options) => {
      if (coverage.active) {
        const jsCoverage = await _page.coverage.stopJSCoverage();
        for (let i = 0, len = jsCoverage.length; i < len; i++)
          await processCoverage(coverage.reports, jsCoverage[i]);
        if (coverage.css) {
          const cssCoverage = await _page.coverage.stopCSSCoverage();
          for (let i = 0, len = cssCoverage.length; i < len; i++)
            await processCoverage(coverage.reports, cssCoverage[i]);
          coverage.css = false;
        }
        coverage.active = false;
      }
      if (options?.coverage) {
        await _page.coverage.startJSCoverage();
        coverage.css = options?.cssCoverage;
        if (coverage.css) _page.coverage.startCSSCoverage();
        coverage.active = true;
      }
      else coverage.active = false;
      await _page.goto(url);
    },
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
      const total = { covered: 0, length: 0 }
      const report = Object.keys(coverage.reports).map((key) => {
        const current = coverage.reports[key];
        total.length += current.total;
        total.covered += current.coverage.size;
        return { file: key, coverage: `${((current.coverage.size / current.total) * 100).toFixed(2)}%` }
      });
      report.push({ file: "total", coverage: `${((total.covered / total.length) * 100).toFixed(2)}%` })
      console.log("\nCode Coverage Report");
      console.table(report)
      console.log("");
    },
    location: async () => new URL(await _page.url())
  }
})(await puppeteer.launch({
  headless: !!process.env.CI,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
}));
const unique = new Set();

if (!process.env.DEBUG) describe("VisttaJS Unit Tests", () => {
  after(async () => {
    await sleep(500);
    await page.coverage();
    process.exit();
  });
  Object.keys(specs).forEach((spec) => Object.keys(specs[spec]).forEach((test) => {
    if (!unique.has(test)) unique.add(test);
    else throw "Duplicated Test Key";
    it(test, async () => {
      await page.navigate(BASE_URL + encodeURIComponent(test), { coverage: true });
      await specs[spec][test].test(page, assert, app);
    })
  }));
});

//

async function processCoverage(reports, { url, ranges, text }) {
  const file = new URL(url).pathname.split("/").pop();
  if (!reports[file]) reports[file] = { total: text.length, coverage: new Set() };
  ranges.forEach(range => {
    for (let i = range.start; i <= range.end; i++) {
      if (i <= reports[file].total)
        reports[file].coverage.add(i);
    }
  });
}