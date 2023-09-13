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

class Route {
  watchedFiles = [];
  resources = {};
  socket = isDev;

  constructor(filepath, pathname, method, config, callback) {
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.method = method;
    this.type = method === "get" ? "page" : "error page";
    this.config = config;
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
      if (this.config?.origin === this.pathname) return response.type(".js").status(200).send(this.config.export).end();
      else if (this?.config?.origin) {
        const url = new URL(`${this.config.origin}/resources/app/config`.replace(/\/\//g, "/"), this.location);
        return response.redirect(url.toString());
      }
    }
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
      this.resources = resources;
      if (config) {
        this.config = ((config.origin = this.pathname), config);
        this.config.export = (
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
      if (this.watchedFiles.includes(file)) return;
      this.watchedFiles.push(file);
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
    if (this.config?.store) this.store = this.config.store;
    const body = renderToString(createElement("v-route", {}, createElement(this.app)));
    if (!BUILD && this.socket) imports.socket = "/socket.io/socket.io.esm.min.js";
    system.set("route", null);
    return renderToHtml({
      ...(this.config || {}),
      imports,
      body,
      client: buildClient(this.code, this.config.export),
      style: this.style,
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
          icon ? createElement("link", { rel: "shortcut icon", href: icon }) : null,
          icon ? createElement("link", { rel: "apple-touch-icon", href: icon }) : null,
          ...(links?.map((props) => createElement("link", props)) || []),
          createElement("style", { nonce }, routeStyle.raw),
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
