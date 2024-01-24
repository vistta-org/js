import { EventEmitter } from "node:events";
import { fs, hash, randomID } from "@vistta/utils";
import { createElement, renderToString } from "../../dom";
import { validate } from "../../../bin/loaders/typescript";
import { system, stringify, BaseFunction, noCache } from "../../../utils";

system.set("document", { scripts: [] });
system.set("HTMLElement", class { });
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
  robots: "index, follow",
};
const CLIENT = (await import(fs.resolve(dirname, BUILD ? "../../../core/build/client" : "../../../core/client"), { assert: { type: 'bundler' } }))?.code;
const CLIENT_STYLE = (await import("./page.css", { assert: { type: 'raw' } }))?.code;
const SERVICE_WORKER = (await import(fs.resolve(dirname, "../../../core/sw"), { assert: { type: 'bundler' } }))?.code;

class PageHandler extends BaseFunction {
  events = new EventEmitter();
  emit;
  watchedFiles = [];

  constructor({ filepath, pathname, type, callback, resources, pwa, template, config }) {
    super((request, response, reject) => this.handler ? this.handler(request, response, reject) : null);
    this.id = hash(filepath);
    this.pwa = pwa;
    this.filepath = fs.resolve(filepath);
    this.resources = resources;
    this.pathname = pathname;
    this.type = type;
    this.template = template;
    this.config = Object.assign({}, CONFIG_DEFAULT, config);
    this.emit = (event, ...args) => {
      this.events.emit(event, ...args);
      callback && callback(event, pathname, type, ...args);
    };
    this.events.on('error', () => null);
  }

  async handler(request, response, reject) {
    if (!IS_DEV && !this.app) return reject();
    this.location = new URL(request?.path, request?.headers?.referer || `${request?.protocol}://${request?.headers?.host}`);
    if (!this.app) await this.import(true);
    if (!request?.resource) {
      const html = this.html;
      if (html) return response.status(this.type !== "error" ? 200 : 404).send(html);
    } else {
      if (request.resource === "app") return response.type(".js").status(200).send(this.script);
      const resource = this.resources.get(request.resource);
      const extension = fs.extname(request.resource);
      if (resource) {
        if (fs.isFile(resource)) return response.sendFile(resource);
        if (extension) response.type(extension);
        return response.send(resource);
      }
    }
    return reject();
  }

  async import(isRefresh) {
    try {
      const { errors } = ["typescript", "type", "all"].includes(VALIDATION) ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const filepath = isRefresh ? noCache(this.filepath) : this.filepath;
      const { default: app, config } = await import(filepath, { cache: !isRefresh });
      const { code, resources, files } = await import(filepath, { assert: { type: 'bundler', exports: "default" } });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      Object.assign(this.config, config);
      this.app = app;
      this.code = code;
      this.resources.add(resources);
      this.resources.add("client.js", CLIENT);
      this.resources.add("client.css", CLIENT_STYLE);
      if (this.type === "app") {
        this.resources.add("manifest.json", manifest(this.config));
        this.resources.add("sw.js", SERVICE_WORKER);
      }
      if (IS_DEV) this.watch(files);
      this.emit("ready");
      return this;
    } catch (e) {
      if (IS_DEV) this.watch([this.filepath]);
      this.emit("error", e.stack);
      return this;
    }
  }

  watch(files) {
    const change = () => (this.app = null, this.emit("change"));
    this.template?.on("change", change);
    for (let i = 0, len = files.length; i < len; i++) {
      if (this.watchedFiles.includes(files[i])) return;
      this.watchedFiles.push(files[i]);
      fs.watchFile(files[i], change);
    }
  }

  on(event, callback) {
    this.events.on(event, callback);
  }

  get html() {
    try {
      system.set("route", this);
      this.styles = this.config?.styles?.map(({ hash }) => ({ href: "./resources/" + hash })) || [];
      const body = renderToString(this.template ? createElement(this.template(), {}, createElement(this.app)) : createElement(this.app));
      system.set("route", null);
      return html({
        ...this.config,
        manifest: this.pwa,
        styles: this.styles,
        body,
        nonce: "v" + randomID(),
      });
    } catch (e) {
      this.emit("error", e.stack);
      return null;
    }
  }

  get script() {
    let script = [this.code];
    if (this.template?.code)
      script.push(
        this.template.code,
        "__app_template = __app_template?.default; export { __app_template as template };",
      );
    script.push(`const __app_config = ${stringify(this.config, IS_DEV)};`, "export { __app_config as config };");
    return script.join(IS_DEV ? "\n" : " ");
  }
}

export default PageHandler;

//

function html({
  author,
  contentType,
  lang,
  title,
  href,
  referrer,
  viewport,
  description,
  keywords,
  theme,
  language,
  manifest,
  icon,
  body,
  nonce,
  links,
  refresh,
  revisitAfter,
  robots,
  styles,
  scripts,
} = {}) {
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
          createElement("meta", {
            "http-equiv": "Content-Type",
            content: contentType || "text/html; charset=utf-8",
          }),
          createElement("meta", { name: "description", content: description }),
          createElement("meta", { name: "keywords", content: keywords }),
          createElement("meta", { name: "theme-color", content: theme }),
          createElement("meta", {
            httpEquiv: "Content-Security-Policy",
            content: `default-src 'self';script-src 'self';style-src 'self' 'nonce-${nonce}';`,
          }),
          createElement("meta", { name: "robots", content: robots }),
          author && createElement("meta", { name: "author", content: author }),
          language && createElement("meta", { name: "language", content: language }),
          refresh && createElement("meta", { "http-equiv": "refresh", content: refresh }),
          revisitAfter && createElement("meta", { name: "revisit-after", content: revisitAfter }),
          manifest &&
          createElement("link", {
            rel: "manifest",
            href: "/resources/manifest.json",
          }),
          icon && createElement("link", { rel: "shortcut icon", href: icon }),
          icon && createElement("link", { rel: "apple-touch-icon", href: icon }),
          ...(links?.map((props) => createElement("link", props)) || []),
          createElement("link", { rel: "preload", href: "./resources/client.js", as: "script" }),
          createElement("link", { rel: "preload", href: "./resources/client.css", as: "style" }),
          createElement("script", { src: "./resources/client.js", defer: true }),
          createElement("link", { rel: "stylesheet", href: "./resources/client.css" }),
          ...(scripts?.map((props) => createElement("script", props)) || []),
          ...(styles?.map(({ href }) => createElement("link", { rel: "preload", href, as: "style" })) || []),
          ...(styles?.map(({ href, id }) => createElement("link", { id, rel: "stylesheet", href })) || []),
        ),
        createElement("body", {}, body),
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
