import { fs } from "../filesystem";
import { hash, randomID } from "../crypto";
import { createElement, renderToString } from "../dom";
import { bundle } from "./bundler.js";
import { validate } from "../../bin/loaders/typescript";
import { system, stringify } from "../../utils";
import routeStyle from "./route.css";

system.set("document", {});
system.set("HTMLElement", class {});
system.set("localStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
system.set("sessionStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
const dirname = fs.dirname(import.meta.url);
const { VALIDATION, NODE_ENV, BUILD } = process.env;
const isDev = NODE_ENV === "development";
const client = (await bundle(fs.resolve(dirname, BUILD ? "../../core/static/client" : "../../core/client")))?.code;
// const serviceWorker = (await bundle(fs.resolve(dirname, "../../core/sw")))?.code;

class Route {
  #config = {};
  #watchedFiles = [];
  socket = isDev;

  constructor(filepath, pathname, method, resources, config, callback) {
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.method = method;
    this.type = method === "get" ? "page" : "error page";
    this.resources = resources;
    this.#config = config;
    this.emit = (event) => callback && callback({ filepath, pathname, event, type: this.type, method });
  }

  async handler(request, response, reject) {
    if (!isDev && !this.app) return reject();
    this.location = getLocation(request);
    //
    let { resource /*, wildcard*/ } = request;
    if (this.resources[resource]) {
      resource = this.resources[resource];
      if (fs.isFile(resource)) return response.sendFile(resource);
      const extension = fs.extname(resource);
      if (extension) response.type(extension);
      return response.send(resource);
    }
    //
    if (!this.app) await this.import(true);
    if (!resource) return response.status(200).send(this.template).end();
    if (resource === "app") return response.type(".js").status(200).send(this.code).end();
    if (resource === "app/config") {
      if (this.#config?.origin === this.pathname) return response.type(".js").status(200).send(this.#config.export).end();
      else if (this.#config?.origin) {
        const url = new URL(`${this.#config.origin}/resources/app/config`.replace(/\/\//g, "/"), this.location);
        return response.redirect(url.toString());
      }
    }
    if (resource === "app/manifest") return response.type(".json").status(200).send(this.manifest).end();
    // if (resource === "app/sw") return response.type(".js").status(200).send(serviceWorker).end();
    return reject();
  }

  async import(isRefresh) {
    try {
      const { errors } = ["typescript", "type", "all"].includes(VALIDATION) ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const { default: app, config } = await system.import(this.filepath, { cache: !isRefresh });
      const { code, resources, files } = await bundle(this.filepath, {
        encode: true,
        exports: "default",
        globalName: BUILD ? "_app" : undefined,
      });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      this.app = app;
      this.code = code;
      Object.assign(this.resources, resources);
      if (config) {
        this.#config = ((config.origin = this.pathname), config);
        this.#config.export = (
          await bundle(this.filepath, {
            encode: true,
            exports: "config",
            globalName: BUILD ? "_config" : undefined,
            sideEffects: false,
          })
        ).code;
      }
      if (isDev) this.watch(files);
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

  get config() {
    return Object.assign(
      {
        title: "Vistta JS",
        href: "/",
        referrer: "origin",
        viewport: "width=device-width,initial-scale=1,minimum-scale=1.0",
        description: "Page generated using VisttaJS",
        keywords: "visttajs",
        theme: "#ffffff",
      },
      this.#config,
    );
  }

  get template() {
    const imports = {};
    system.set("route", this);
    this.style = this.config?.styles?.reduce((acc, { raw }) => acc + raw, "") || "";
    if (this.config?.store) this.store = this.config.store;
    const body = renderToString(BUILD ? createElement(this.app) : createElement("app-route", {}, createElement(this.app)));
    if (!BUILD && this.socket) imports.socket = "/socket.io/socket.io.esm.min.js";
    system.set("route", null);
    return renderToHtml({
      ...this.config,
      imports,
      body,
      client: buildClient(this.code, this.config.export),
      style: this.style,
    });
  }

  get manifest() {
    let config = this.config;
    if (typeof config.manifest === "object") Object.assign(config, config.manifest);
    return JSON.stringify({
      theme_color: config.theme,
      background_color: config.background || "#ffffff",
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
}

export { Route };

//

function renderToHtml({
  lang,
  title,
  href,
  referrer,
  viewport,
  description,
  keywords,
  theme,
  icon,
  imports,
  body,
  client,
  links,
  style,
  scripts,
  manifest,
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
          createElement("title", null, title || "Vistta JS"),
          createElement("base", { href: href || "/" }),
          createElement("meta", { name: "referrer", content: referrer || "origin" }),
          createElement("meta", {
            name: "viewport",
            content: viewport || "width=device-width,initial-scale=1,minimum-scale=1.0",
          }),
          createElement("meta", { name: "description", content: description || "Page generated using VisttaJS" }),
          createElement("meta", { name: "keywords", content: keywords || "visttajs" }),
          createElement("meta", { name: "theme-color", content: theme || "#ffffff" }),
          createElement("meta", {
            httpEquiv: "Content-Security-Policy",
            content: `default-src 'self';script-src 'self' 'nonce-${nonce}';style-src 'self' 'nonce-${nonce}';`,
          }),
          manifest &&
            createElement("link", {
              rel: "manifest",
              href: typeof manifest === "string" ? manifest : "/resources/app/manifest",
            }),
          icon && createElement("link", { rel: "shortcut icon", href: icon }),
          icon && createElement("link", { rel: "apple-touch-icon", href: icon }),
          ...(links?.map((props) => createElement("link", props)) || []),
          BUILD && createElement("style", { nonce }, routeStyle.raw),
          createElement("style", { id: "route", nonce }, style),
          createElement("script", { type: "importmap", nonce }, stringify({ imports })),
          ...(scripts?.map((props) => createElement("script", props)) || []),
        ),
        createElement("body", { unescaped: true }, body),
        createElement("script", { nonce }, client),
      ),
    )
  );
}

function buildClient(code, config) {
  if (!BUILD) return client;
  return `const _importApp = ()=>{ const _e = {}; ${code} _e.app = _app?.default; ${config} _e.config = _config?.config; return _e; }; ${client}`;
}

function getLocation({ path, protocol, headers: { host, referer } }) {
  return new URL(path, referer || `${protocol}://${host}`);
}
