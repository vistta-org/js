import Server from "../server/index.js";
import fs from "@vistta/fs";
import { sleep } from "@vistta/utils";
import puppeteer from "puppeteer";
import { URL } from "node:url";
import * as specs from "./specs";

const PORT = 3000;
const CODE_COVERAGE_THRESHOLD = 50;
const BASE_URL = `http://localhost:${PORT}/`;
const app = await new Promise((resolve, reject) => {
  const _app = new Server({ http: PORT, autoStart: true });
  _app.use(fs.dirname(import.meta.url), "/", (event, ...args) => {
    switch (event) {
      case "error":
        return reject(args);
      case "ready":
        return resolve(_app);
    }
  });
});

const page =
  !process.env.DEBUG &&
  (await (async (browser) => {
    const _page = (await browser.pages())?.[0] || (await browser.newPage());
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
        } else coverage.active = false;
        await _page.goto(url);
      },
      reload: async () => await _page.goto(await _page.url()),
      sleep: (delay) => sleep(delay),
      click: (selector, options) => _page.click(selector, options),
      querySelector: async (selector, options) => {
        if (options?.wait)
          return await _page.waitForSelector(selector, options);
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
        if (options?.submit !== false) await _page.keyboard.press("Enter");
      },
      press: async (selector, value) => {
        await _page.click(selector);
        await _page.keyboard.press(value);
      },
      coverage: (callback) => {
        const total = { covered: 0, length: 0 };
        Object.keys(coverage.reports).forEach((key) => {
          const current = coverage.reports[key];
          total.length += current.total;
          total.covered += current.coverage.size;
          callback(
            key,
            ((current.coverage.size / (current.total || 1)) * 100).toFixed(2),
          );
        });
        callback(
          "Total",
          ((total.covered / (total.length || 1)) * 100).toFixed(2),
        );
      },
      dimensions: () =>
        _page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        })),
      location: async () => new URL(await _page.url()),
      close: () => browser.close(),
    };
  })(
    await puppeteer.launch({
      headless: !!process.env.CI,
      ignoreDefaultArgs: ["--disable-extensions"],
      args: ["--no-sandbox"],
    }),
  ));
const unique = new Set();

if (!process.env.DEBUG) {
  await describe("VisttaJS Unit Tests", async () => {
    Object.keys(specs).forEach((spec) =>
      Object.keys(specs[spec]).forEach((test) => {
        if (!unique.has(test)) unique.add(test);
        else throw "Duplicated Test Key";
        it(test, async () => {
          await page.navigate(BASE_URL + encodeURIComponent(test), {
            coverage: true,
          });
          await specs[spec][test].test(page, assert, app);
        });
      }),
    );
  });
  await describe("VisttaJS Code Coverage", () =>
    page.coverage((target, coverage) =>
      it(`Code Coverage: ${target}: ${coverage}%`, () =>
        assert.equal(coverage > CODE_COVERAGE_THRESHOLD, true)),
    ));
  page.close();
  app.stop();
} else console.log("Debug Test Server Ready", BASE_URL);

//

async function processCoverage(reports, { url, ranges, text }) {
  const file = new URL(url).pathname.split("/").pop();
  if (!reports[file])
    reports[file] = { total: text.length, text, coverage: new Set() };
  ranges.forEach((range) => {
    for (let i = range.start; i <= range.end; i++) {
      if (i <= reports[file].total) reports[file].coverage.add(i);
    }
  });
}
