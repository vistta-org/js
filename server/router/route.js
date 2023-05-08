import { fs } from "../filesystem";
import { hash, randomID } from "../crypto";
import { createElement, renderToString } from "../dom";
// import { store } from "../../../core/store";
// import { renderToString } from "react-dom/server";
import { bundle } from "./bundler.js";
import { importModule } from "@/bin/loaders";
import { validate } from "@/bin/loaders/typescript";
import { system, stringify, encode } from "@/utils";
// import { URL } from "url";

system.set("document", {});
system.set("HTMLElement", class {});
system.set("localStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
system.set("sessionStorage", { setItem: () => null, getItem: () => undefined, removeItem: () => null, clear: () => null });
const dirname = fs.dirname(import.meta.url);
const { TYPESCRIPT_VALIDATION, NODE_ENV } = process.env;
const isDev = NODE_ENV === "development";
const client = await (async (path) => (await bundle(path))?.code)(fs.resolve(dirname, "../../core/client"));

class Route {
  watchedFiles = [];
  resources = {};
  socket = isDev;
  styles = new Map([["root", rootStyle()]]);

  constructor({ filepath, pathname, type = "", config, callback }) {
    this.id = hash(filepath);
    this.filepath = fs.resolve(filepath);
    this.pathname = pathname;
    this.type = type;
    this.config = config;
    this.listener = (event) => callback && callback({ filepath, pathname, event, type });
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
      if (this.config.origin !== this.pathname) {
        const url = new URL(`${this.config.origin}/resources/app/config`.replace(/\/\//g, "/"), this.location);
        return response.redirect(url.toString());
      }
      return response.type(".js").status(200).send(this.code).end();
    }
    return reject();
  }

  async import(isRefresh) {
    try {
      if (isRefresh) this.listener("refresh");
      const { errors } = TYPESCRIPT_VALIDATION !== "none" ? validate(this.filepath) : {};
      if (errors?.length) throw new Error("Unexpected Bundler Error:\n" + stringify(errors));
      const { default: app, config } = await importModule(this.filepath, { cache: !isRefresh });
      const { code, resources, files } = await bundle(this.filepath, { encode: true });
      if (!code || code === "") throw new Error("Unexpected Bundler Error");
      this.app = app;
      this.code = code;
      this.resources = resources;
      if (config) this.config = ((config.origin = this.pathname), config);
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
    // if (this.config?.store) store.set(this.config?.store);
    const content = renderToString(createElement("app-root", null, createElement(this.app)));
    if (this.socket) imports.socket = "/socket.io/socket.io.esm.min.js";
    system.set("route", null);
    return renderToHtml({ ...(this.config || {}), imports, content, client, styles: Array.from(this.styles.values()) });
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
  content,
  client,
  links,
  styles,
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
            content: `default-src 'self';script-src 'self' 'nonce-${nonce}';style-src 'self' 'unsafe-inline' data:;`,
          }),
          icon ? createElement("link", { rel: "shortcut icon", href: icon }) : null,
          icon ? createElement("link", { rel: "apple-touch-icon", href: icon }) : null,
          ...(links?.map((props) => createElement("link", props)) || []),
          ...(styles?.map(({ id, href }) => createElement("link", { rel: "stylesheet", id, href })) || []),
          createElement("script", { type: "importmap", nonce }, stringify({ imports })),
          ...(scripts?.map((props) => createElement("script", props)) || [])
        ),
        createElement("body", { unescaped: true }, content),
        createElement("script", { nonce }, client)
      )
    )
  );
}

function rootStyle() {
  return {
    href:
      "data:text/css;base64," +
      encode(
        `app-root {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  color: white;
  background: rgb(35,35,35);
  overflow-y: auto;
  overflow-x: hidden;
}

app-root:after {
  position: fixed;
  width: 48px;
  height: 48px;
  right: 1vw;
  bottom: 1vw;
  backdrop-filter: invert(85%);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: app-root-animation 1s ease-in-out infinite;
}
app-root.loading:after { content: ""; }

@keyframes app-root-animation {
  0%{
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100%{
    transform: translate(-50%, -50%) scale(1.0);
    opacity: 0;
  }
}`.replace(/(?<= ) | +$|(?<=\n)\n/gm, "")
      ),
  };
}

function getLocation(request, pathname) {
  const {
    protocol,
    headers: { host, referer },
  } = request;
  return new URL(pathname, referer || `${protocol}://${host}`);
}