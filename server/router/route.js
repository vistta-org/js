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
const { VALIDATION, NODE_ENV } = process.env;
const isDev = NODE_ENV === "development";
const client = await (async (path) => (await bundle(path))?.code)(fs.resolve(dirname, "../../core/client"));

class Route {
  watchedFiles = [];
  resources = {};
  socket = isDev;

  constructor(filepath, pathname, method, config, callback) {
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.method = method;
    this.type = method === "get" ? "standard" : "error";
    this.config = config;
    this.listener = (event) => callback && callback({ filepath, pathname, event, type: this.type });
  }

  async handler(request, response, reject) {
    if (!isDev && !this.app) return reject();
    this.location = getLocation(request, this.pathname);
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
      if (isRefresh) this.listener("refresh");
      const { errors } = ["typescript", "type", "all"].includes(VALIDATION) ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const { default: app, config } = await system.import(this.filepath, { cache: !isRefresh });
      const { code, resources, files } = await bundle(this.filepath, { encode: true, exports: "default" });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      this.app = app;
      this.code = code;
      this.resources = resources;
      if (config) {
        this.config = ((config.origin = this.pathname), config);
        this.config.export = (await bundle(this.filepath, { encode: true, exports: "config", sideEffects: false })).code;
      }
      if (isDev) this.watch(files);
      this.listener(isRefresh ? "refreshed" : "compiled");
      return this;
    } catch (e) {
      console.error(e.stack);
      return this;
    }
  }

  watch(files) {
    files.forEach((file) => {
      if (!this.watchedFiles.includes(file)) {
        this.watchedFiles.push(file);
        fs.watchFile(file, () => {
          this.app = null;
          this.listener("changed");
        });
      }
    });
  }

  get template() {
    const imports = {};
    system.set("route", this);
    if (this.config?.store) this.store = this.config.store;
    const body = renderToString(createElement("v-route", {}, createElement(this.app)));
    if (this.socket) imports.socket = "/socket.io/socket.io.esm.min.js";
    system.set("route", null);
    return renderToHtml({ ...(this.config || {}), imports, body, client });
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
  styles,
  scripts,
} = {}) {
  const nonce = "v" + randomID();
  if (!styles || !Array.isArray(styles)) styles = [];
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
            content: `default-src 'self';script-src 'self' 'nonce-${nonce}';style-src 'self' 'unsafe-inline' data:;`,
          }),
          icon ? createElement("link", { rel: "shortcut icon", href: icon }) : null,
          icon ? createElement("link", { rel: "apple-touch-icon", href: icon }) : null,
          ...(links?.map((props) => createElement("link", props)) || []),
          createElement("style", {}, routeStyle.value),
          createElement(
            "style",
            { id: "route" },
            styles?.reduce((acc, { value }) => acc + " " + value, "")
          ),
          createElement("script", { type: "importmap", nonce }, stringify({ imports })),
          ...(scripts?.map((props) => createElement("script", props)) || [])
        ),
        createElement("body", { unescaped: true }, body),
        createElement("script", { nonce }, client)
      )
    )
  );
}

function getLocation(request, pathname) {
  const {
    protocol,
    headers: { host, referer },
  } = request;
  return new URL(pathname, referer || `${protocol}://${host}`);
}
