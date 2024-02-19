import { EventEmitter } from "node:events";
import { fs, hash } from "@vistta/utils";
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
const CLIENT = (await import(fs.resolve(dirname, BUILD ? "../../../core/build/client" : "../../../core/client"), { with: { type: 'bundler' } }))?.code;
const CLIENT_STYLE = (await import("./page.css", { with: { type: 'raw' } }))?.code;
const SERVICE_WORKER = (await import(fs.resolve(dirname, "../../../core/sw"), { with: { type: 'bundler' } }))?.code;

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
    try {
      if (!IS_DEV && !this.app) return reject();
      this.location = new URL(request?.path, request?.headers?.referer || `${request?.protocol}://${request?.headers?.host}`);
      if (!this.app) await this.import(true);
      let resource = request?.resource;
      if (!resource) {
        const next = (...args) => {
          const html = this.render(...args);
          response.status(this.type !== "error" ? 200 : 404).send(html);
        }
        if (typeof this.gateway !== "function") return next({});
        return this.gateway(request, {
          next,
          redirect: (...args) => response.redirect(...args),
          reject: (...args) => reject(...args),
        });
      }
      switch (resource) {
        case "app.css":
          const stylesheet = this.stylesheet();
          return response.type(".css").status(200).send(stylesheet);
        case "app.js":
          const next = (...args) => {
            const script = this.script(...args);
            response.type(".js").status(200).send(script);
          }
          if (typeof this.gateway !== "function") return next({});
          return this.gateway(request, {
            next,
            redirect: (...args) => response.redirect(...args),
            reject: (...args) => reject(...args),
          });
        default:
          const extension = fs.extname(resource);
          resource = this.resources.get(resource);
          if (!resource) return reject();
          if (fs.isFile(resource)) return response.status(200).sendFile(resource);
          if (extension) response.type(extension);
          return response.status(200).send(resource);
      }
    }
    catch (e) {
      this.emit("error", e.stack);
      reject();
    }
  }

  async import(isRefresh) {
    try {
      const { errors } = ["typescript", "type", "all"].includes(VALIDATION) ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const filepath = isRefresh ? noCache(this.filepath) : this.filepath;
      const { default: app, config, gateway } = await import(filepath, { cache: !isRefresh });
      const { code, resources, files } = await import(filepath, { with: { type: 'bundler', exports: "default" } });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      Object.assign(this.config, config);
      this.app = app;
      this.code = code;
      this.gateway = gateway;
      this.styles = {};
      const keys = Object.keys(resources);
      for (let i = 0, len = keys.length; i < len; i++) {
        const resource = keys[i];
        if (resource.endsWith(".scoped.css")) this.styles[resource] = resources[resource];
        else this.resources.add(resource, resources[resource]);
      }
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

  render(props) {
    system.set("route", this);
    const body = renderToString(this.template ? createElement(this.template(), {}, createElement(this.app, props)) : createElement(this.app, props));
    system.set("route", null);
    const { pathname } = this.location;
    const styleHref = `.${pathname + (pathname.endsWith("/") ? "" : "/")}resources/app.css`;
    return (
      "<!doctype html>\n" +
      renderToString(
        createElement(
          "html",
          { lang: this.config?.lang || "en" },
          createElement(
            "head",
            null,
            createElement("title", null, this.config.title),
            createElement("base", { href: this.config.href }),
            createElement("meta", { name: "referrer", content: this.config?.referrer || "origin" }),
            createElement("meta", {
              name: "viewport",
              content: this.config?.viewport || "width=device-width,initial-scale=1,minimum-scale=1.0",
            }),
            createElement("meta", {
              "http-equiv": "Content-Type",
              content: this.config?.contentType || "text/html; charset=utf-8",
            }),
            createElement("meta", { name: "description", content: this.config.description }),
            createElement("meta", { name: "keywords", content: this.config.keywords }),
            createElement("meta", { name: "theme-color", content: this.config.theme }),
            createElement("meta", {
              httpEquiv: "Content-Security-Policy",
              content: `default-src 'self';script-src 'self';style-src 'self';`,
            }),
            createElement("meta", { name: "robots", content: this.config.robots }),
            this.config?.author && createElement("meta", { name: "author", content: this.config.author }),
            this.config?.language && createElement("meta", { name: "language", content: this.config.language }),
            this.config?.refresh && createElement("meta", { "http-equiv": "refresh", content: this.config.refresh }),
            this.config?.revisitAfter && createElement("meta", { name: "revisit-after", content: this.config.revisitAfter }),
            this.pwa &&
            createElement("link", {
              rel: "manifest",
              href: "/resources/manifest.json",
            }),
            this.config?.icon && createElement("link", { rel: "shortcut icon", href: this.config.icon }),
            this.config?.icon && createElement("link", { rel: "apple-touch-icon", href: this.config.icon }),
            ...(this.config?.links?.map((props) => createElement("link", props)) || []),
            createElement("script", { src: "./resources/client.js", defer: true }),
            createElement("link", { rel: "stylesheet", href: "./resources/client.css" }),
            createElement("link", { rel: "preload", href: styleHref, as: "style" }),
            createElement("link", { id: "app-style", rel: "stylesheet", href: styleHref }),
            ...(this.config?.scripts?.map((props) => createElement("script", props)) || []),
            ...(this.config?.styles?.map(({ hash }) => createElement("link", { rel: "preload", href: "./resources/" + hash, as: "style" })) || []),
            ...(this.config?.styles?.map(({ hash }) => createElement("link", { rel: "stylesheet", href: "./resources/" + hash })) || []),
          ),
          createElement("body", {}, body),
        ),
      )
    );
  }

  script(props) {
    let script = [this.code];
    if (this.template?.code)
      script.push(
        this.template.code,
        "__app_template = __app_template?.default; export { __app_template as template };",
      );
    if (props) script.push(`const __app_props = ${stringify(props, IS_DEV)};`, "export { __app_props as props };");
    script.push(`const __app_config = ${stringify(this.config, IS_DEV)};`, "export { __app_config as config };");
    return script.join(IS_DEV ? "\n" : " ");
  }

  stylesheet() {
    return Object.values(this.styles || {}).join(IS_DEV ? "\n" : " ");
  }
}

export default PageHandler;

//

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
