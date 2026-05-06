import { Bundler, parseArgs } from "@vistta/cli";
import { COLORS } from "@vistta/console";
import "@vistta/console/global";
import fs from "@vistta/fs";
import { BrowserWindow, app as electron, ipcMain } from "electron/main";

const cwd = process.cwd();
process.env.NODE_ENV = "testing";
const envKeys = Object.keys(process.env);
for (let i = 0, len = envKeys.length; i < len; i++) {
  const key = envKeys[i].toLowerCase();
  if (!key.startsWith("vistta_")) continue;
  try {
    if (!process.vistta) process.vistta = { loaders: [], resolvers: [], options: {} };
    process.vistta[key.substring(7).toLowerCase()] = JSON.parse(process.env[envKeys[i]]);
  } catch {
    /* Ignore */
  }
}
if (process.env.NODE_DEBUG === "true") ipcMain.on("console", (_, { level, args }) => console[level]?.(...args));
const bundler = new Bundler();
let renderer;
const results = [];
let failed = false;

async function main() {
  let [args, options] = parseArgs(process.argv.slice(2));
  if (args.length === 0) args = ["**/*.test.js", "**/*.test.ts", "**/*.test.jsx", "**/*.test.tsx"];
  for (let i = 0, len = args.length; i < len; i++) args[i] = fs.resolve(cwd, args[i]);
  const entries = fs.glob(args);
  let entry = (await entries.next())?.value;
  while (entry) {
    try {
      process.chdir(fs.dirname(entry));
      if (!entry.includes("\\node_modules\\")) results.push(...(await load(fs.resolve(entry), options)));
    } catch {
      failed = true;
    }
    entry = (await entries.next())?.value;
  }
  let output = "";
  for (let i = 0, len = results.length; i < len; i++) {
    const { name, tests } = results[i];
    let passing = 0;
    let total = 0;
    let first, last;
    if (name) output += `\n${name}\n`;
    for (let n = 0, nlen = tests?.length || 0; n < nlen; n++) {
      const { name, status, start, end, result, error } = tests[n];
      if (!first || start < first) first = start;
      if (!last || end > last) last = end;
      switch (status) {
        case "pass":
          output += `  ${COLORS.GREEN}PASSED  ${name} ${COLORS.RESET + COLORS.DIM}(${Math.round(end - start)}ms)${COLORS.RESET}\n${typeof result === "string" ? "\t" + COLORS.GREEN + result + COLORS.RESET + "\n" : ""}`;
          passing++;
          total++;
          break;
        case "fail":
          output += `  ${COLORS.RED}FAILED  ${name} ${COLORS.RESET + COLORS.DIM}(${Math.round(end - start)}ms)${COLORS.RESET}\n\t${COLORS.RED + error + COLORS.RESET}\n`;
          total++;
          break;
        case "skip":
          output += `  ${COLORS.YELLOW}SKIPPED ${name} ${COLORS.RESET + COLORS.DIM}(${Math.round(end - start)}ms)${COLORS.RESET}\n`;
          break;
      }
    }
    if (total !== passing) failed = true;
    output += `${passing === total ? COLORS.GREEN : COLORS.RED}${passing}/${total} passing ${COLORS.RESET + COLORS.DIM}(${Math.round(last - first)}ms)${COLORS.RESET}\n`;
  }
  console.print(output);
  if (process.env.NODE_DEBUG !== "true") process.exit(failed ? -1 : 0);
}

async function load(file, options) {
  if (!renderer)
    renderer = {
      window: new BrowserWindow({
        title: "Vistta JS Tests",
        show: process.env.NODE_DEBUG === "true",
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          webviewTag: true,
        },
      }),
      code: `globalThis.ipc = (require('electron')).ipcRenderer;\nglobalThis.testOptions = ${JSON.stringify(options)};\n${
        (
          await bundler.run(fs.resolve(import.meta.dirname, "renderer.js"), {
            write: false,
            platform: "node",
            importAttributes: {
              app: true,
            },
            format: "iife",
          })
        )?.code
      }`,
    };
  renderer.window.loadFile(fs.resolve(import.meta.dirname, "template.html"));
  renderer.window.webContents.executeJavaScript(
    renderer.code +
      (
        await bundler.run(file, {
          write: false,
          platform: "node",
          importAttributes: {
            app: true,
          },
          globalName: "main",
          format: "iife",
        })
      )?.code,
  );
  return new Promise((resolve) => ipcMain.on("test-results", (_, results) => resolve(results)));
}

electron.whenReady().then(main);
