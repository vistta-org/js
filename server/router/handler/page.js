import { fs } from "../../filesystem";
import { hash, randomID } from "../../crypto";
import { createElement, renderToString } from "../../dom";
import { bundle } from "./bundler.js";
import { validate } from "../../../bin/loaders/typescript";
import { system, stringify, ExtensibleFunction } from "../../../utils";
import pageStyle from "./page.css";

system.set("document", {});
system.set("HTMLElement", class {});
system.set("localStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
system.set("sessionStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
const dirname = fs.dirname(import.meta.url);
const { VALIDATION, NODE_ENV, BUILD } = process.env;
const IS_DEV = NODE_ENV === "development";
const CONFIG_DEFAULT = {
  title: "Vistta JS",
  description: "Page generated using VisttaJS",
  theme: "#ffffff",
  href: "/",
  referrer: "origin",
  viewport: "width=device-width,initial-scale=1,minimum-scale=1.0",
  keywords: "visttajs",
};
const CLIENT = (await bundle(fs.resolve(dirname, BUILD ? "../../../core/static/client" : "../../../core/client")))?.code;
const SERVICE_WORKER = (await bundle(fs.resolve(dirname, "../../../core/sw")))?.code;

class PageHandler extends ExtensibleFunction {
  #watchedFiles = [];

  constructor({ filepath, pathname, type, callback, resources, pwa, store, config }) {
    super((...args) => this.handler && this.handler(...args));
    this.id = hash(filepath);
    this.pwa = pwa;
    this.filepath = fs.resolve(filepath);
    this.resources = resources;
    this.pathname = pathname;
    this.type = type;
    this.store = store;
    this.config = Object.assign({}, CONFIG_DEFAULT, config);
    this.emit = (event) => callback && callback({ filepath, pathname, event, type });
  }

  async handler(request, response, reject) {
    if (!IS_DEV && !this.app) return reject();
    this.location = new URL(request?.path, request?.headers?.referer || `${request?.protocol}://${request?.headers?.host}`);
    if (!this.app) await this.import(true);
    if (!request?.resource) return response.status(200).send(this.template).end();
    if (request.resource === "app") return response.type(".js").status(200).send(this.code).end();
    const resource = this.resources.get(request.resource);
    const extension = fs.extname(request.resource);
    if (resource) {
      if (fs.isFile(resource)) return response.sendFile(resource);
      if (extension) response.type(extension);
      return response.send(resource);
    }
    return reject();
  }

  async import(isRefresh) {
    try {
      const { errors } = ["typescript", "type", "all"].includes(VALIDATION) ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const { default: app, config } = await system.import(this.filepath, { cache: !isRefresh });
      const { code, resources, files } = await bundle(this.filepath, {
        exports: "default",
        globalName: BUILD ? "__app" : undefined,
      });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      Object.assign(this.config, config);
      this.app = app;
      this.code = ((script) => {
        if (this.store?.__code)
          script.push(
            this.store.__code,
            "__app_store = __app_store?.default;",
            BUILD ? "__app.store = __app_store;" : "export { __app_store as store };",
          );
        if (BUILD) script.push(`__app.config = ${stringify(this.config, IS_DEV)};`);
        else script.push(`const __app_config = ${stringify(this.config, IS_DEV)};`, "export { __app_config as config };");
        return script.join(IS_DEV ? "\n" : " ");
      })([code]);
      this.resources.add(resources);
      if (this.type === "app") {
        this.resources.add("manifest.json", manifest(this.config));
        this.resources.add("sw.js", SERVICE_WORKER);
      }
      if (IS_DEV) this.watch(files);
      this.emit("ready");
      return this;
    } catch (e) {
      console.error(e.stack);
      return this;
    }
  }

  watch(files) {
    files.forEach((file) => {
      if (this.#watchedFiles.includes(file)) return;
      this.#watchedFiles.push(file);
      fs.watchFile(file, () => {
        this.app = null;
        this.emit("modified");
      });
    });
  }

  get template() {
    const imports = {};
    system.set("route", this);
    this.style = this.config?.styles?.reduce((acc, { raw }) => acc + raw, "") || "";
    const body = renderToString(createElement(this.app));
    if (!BUILD) imports.socket = "/socket.io/socket.io.esm.min.js";
    system.set("route", null);
    return html({
      ...this.config,
      manifest: this.pwa,
      imports,
      body,
      client: !BUILD ? CLIENT : `const __import_app = ()=>{ ${this.code} return __app; }; ${CLIENT}`,
      style: this.style,
    });
  }
}

export default PageHandler;

//

function html({
  lang,
  title,
  href,
  referrer,
  viewport,
  description,
  keywords,
  theme,
  manifest,
  icon,
  imports,
  body,
  client,
  links,
  style,
  scripts,
} = {}) {
  const nonce = "v" + randomID();
  return (
    "<!doctype html>\n" +
    renderToString(
      createElement(
        "html",
        { lang: lang || "en" },
        createElement(
          "head",
          null,
          createElement("title", null, title),
          createElement("base", { href: href }),
          createElement("meta", { name: "referrer", content: referrer || "origin" }),
          createElement("meta", {
            name: "viewport",
            content: viewport || "width=device-width,initial-scale=1,minimum-scale=1.0",
          }),
          createElement("meta", { name: "description", content: description }),
          createElement("meta", { name: "keywords", content: keywords || "visttajs" }),
          createElement("meta", { name: "theme-color", content: theme }),
          createElement("meta", {
            httpEquiv: "Content-Security-Policy",
            content: `default-src 'self';script-src 'self' 'nonce-${nonce}';style-src 'self' 'nonce-${nonce}';`,
          }),
          manifest &&
            createElement("link", {
              rel: "manifest",
              href: "/resources/manifest.json",
            }),
          icon && createElement("link", { rel: "shortcut icon", href: icon }),
          icon && createElement("link", { rel: "apple-touch-icon", href: icon }),
          ...(links?.map((props) => createElement("link", props)) || []),
          createElement("style", { nonce }, pageStyle.raw),
          createElement("style", { id: "route", nonce }, style),
          createElement("script", { type: "importmap", nonce }, stringify({ imports })),
          ...(scripts?.map((props) => createElement("script", props)) || []),
        ),
        createElement("body", {}, body),
        createElement("script", { nonce }, client),
      ),
    )
  );
}

function manifest(config) {
  if (typeof config.manifest === "object") Object.assign(config, config.manifest);
  return JSON.stringify({
    id: config.id || (config.name && config.version ? config.name + "_" + config.version : undefined),
    theme_color: config.theme,
    background_color: config.background,
    display: config.display || "fullscreen",
    scope: config.scope || config.href,
    start_url: config.start_url || config.href,
    name: config.name || config.title,
    short_name: config.short_name || config.title,
    description: config.description,
    shortcuts: config.shortcuts,
    icons: ((icon) => {
      if (!icon) return [];
      const type = fs.extname(icon).slice(1);
      return [
        {
          src: icon,
          type: "image/" + type,
          sizes: "192x192",
        },
        {
          src: icon,
          type: "image/" + type,
          sizes: "512x512",
        },
      ];
    })(config.icon),
  });
}
