import { Bundler } from "@vistta/cli";
import fs from "@vistta/fs";
import { BrowserWindow, app as electron, ipcMain } from "electron/main";
import { fileURLToPath } from "node:url";

const BUNDLER_OPTIONS = {
  write: false,
  platform: "node",
  importAttributes: {
    app: true,
  },
};

const envKeys = Object.keys(process.env);
for (let i = 0, len = envKeys.length; i < len; i++) {
  const key = envKeys[i].toLowerCase();
  if (!key.startsWith("vistta_")) continue;
  try {
    process.vistta = process.vistta || {};
    process.vistta[key.substring(7).toLowerCase()] = JSON.parse(process.env[envKeys[i]]);
  } catch {
    /* Ignore */
  }
}
const bundler = new Bundler();

export default class App {
  #window;
  #main;

  constructor(filepath) {
    this.#main = filepath;
  }

  async start() {
    await electron.whenReady();
    const { config } = await bundler.import(this.#main, {
      ...BUNDLER_OPTIONS,
      exports: "config",
    });
    if (config.icon?.startsWith("file://")) config.icon = fileURLToPath(config.icon);
    this.#window = new BrowserWindow({
      ...(config || {}),
      frame: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webviewTag: true,
      },
    });
    this.#window.loadFile(fs.resolve(import.meta.dirname, "template.html"));
    this.#window.webContents.executeJavaScript(
      "const { ipcRenderer: __app } = require('electron');\n" +
        (
          await bundler.run(fs.resolve(import.meta.dirname, "renderer.js"), {
            ...BUNDLER_OPTIONS,
            format: "iife",
          })
        )?.code +
        "\n" +
        (
          await bundler.run(this.#main, {
            ...BUNDLER_OPTIONS,
            globalName: "main",
            format: "iife",
          })
        )?.code,
    );
    electron.on("window-all-closed", () => process.platform !== "darwin" && electron.quit());
  }

  emit(event, ...args) {
    this.#window.webContents.send(event, { args });
  }

  on(event, callback) {
    ipcMain.on(event, (_, { args }) => callback(...args));
  }
}
