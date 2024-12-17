/*import { EventEmitter } from "node:events";
import { Bundler } from "@vistta/cli";
import { default as DefaultCLI } from "../cli/default.js";
import fs from "@vistta/fs";
const { app: electron, BaseWindow, BrowserView, WebContentsView } = await importElectron();
const bundler = new Bundler(new DefaultCLI());
const { Element } = await import("./dom.js");
const platform = process.platform;

class App {
  #instance;
  #ready = false;
  #events = new EventEmitter();

  get bounds() {
    if(!this.#ready) return {};
    return this.#instance.getBounds();
  }

  constructor(...args) {
    if(args.length == 1) args.unshift(null);
    if(args.length != 2) throw new Error('Invalid arguments.');
    const [target, options = {}] = args;
    options.width ??= 800;
    options.height ??= 600;
    options.minWidth ??= (platform === 'win32' ? 400 : 320);
    options.minHeight ??= 350;
    if(platform === 'win32') options.backgroundMaterial = 'auto';
    electron.on('ready', () => {
      this.#ready = true;
      if(target) this.use(target, options);
      else this.#instance = new BaseWindow(options);
      this.#events.emit("ready", this.#instance.getBounds());
      this.#instance.on('will-resize', (_, bounds) => this.#events.emit("resize", bounds));
      this.#instance.on('resize', () => this.#events.emit("resize", this.#instance.getBounds()));
    });
    electron.on('window-all-closed', () => process.platform !== 'darwin' && electron.quit());
  }


  async use(target, options = {}) {
    if(!this.#ready) return setTimeout(() => this.load(target), 100);
    if(isUrl(target)) {
      this.#instance = new Browser({ show: false });
      this.#instance.loadURL(target);
      return this;
    }
    
    //(bundler.import(fs.resolve(process.cwd(), target), { platform: "node" })).then(console.log);
  }

  async on(...args) {
    return this.#events.on(...args);
  }

  async createView(options = {}) {
    if(!this.#ready) throw new Error('App not ready.');
    const view = new View(this, options);
    this.#instance.contentView.addChildView(view);
    return view;
  }
}

/*class View extends WebContentsView {
  #parent;
  constructor(parent, options = {}) {
    super(options);
    this.#parent = parent;
    this.setBounds(options);
  }

  setBounds({ x, y, width, height, border }) {
    super.setBounds({ x, y, width, height});
    if(border) super.setBorderRadius(border);
  }

  load(target) {
    if(isUrl(target)) this.webContents.loadURL(target);
    else {
      new Bundler(new DefaultCLI()).run({ filename: pathToFileURL(fs.resolve(process.cwd(), target)), write: false }).then(({ code }) => {
        console.log(code)
      });
      // this.webContents.loadFile(target);
    }
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }
}

async function importElectron() {
  try {
    return await import('electron/main');
  }
  catch {
    throw new Error('You must use the --app flag to use @vistta/js/app.');
  }
}

export { App };

//

function isUrl(url) {
  try {
    new URL(url);
    return true;
  }
  catch {
    return false;
  }
}*/