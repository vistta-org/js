import fs from "@vistta/fs";
import { compileStringAsync as compileSassString } from 'sass-embedded';
import { Element, renderToString } from "./dom.js";
import { RESOURCES_PATH, stringify } from "../utils/index.js";

const dirname = fs.dirname(import.meta.url);
const IS_DEV = process.env.NODE_ENV === "development";

export async function importCoreResources(build) {
  return {
    [`/${RESOURCES_PATH}/client.js`]: (process.env.NODE_ENV === "development" ? "\n" : "") + (await import(fs.resolve(dirname, build ? "../core/build/client" : "../core/client"), { with: { type: "bundler" } }))?.code,
    [`/${RESOURCES_PATH}/client.css`]: (await import(fs.resolve(dirname, "../core/client.css"), { with: { type: "reader" } }))?.default
  }
}

export async function createPage(type, filepath, pathname, inheritedConfigs, inheritedMiddleware, inheritedLayout) {
  const { default: content, config, middleware } = await import(filepath);
  const { code, errors, resources } = await import(filepath, {
    with: { type: "bundler", exports: "default" },
  });
  const page = {
    type,
    pathname,
    config,
    content,
    resources,
    styles: [],
    cache: cache(),
    inherited: {
      configs: inheritedConfigs || [],
      middleware: inheritedMiddleware,
      layout: inheritedLayout
    }
  };
  if (errors?.length) throw new Error(errors[0]);
  if (!code || code === "") throw new Error("Unexpected Bundler Error");
  page.html = async (request, props, build) => {
    page.location = new URL(request.url, request.headers.referer || `http://${request.headers.host}/`)
    return await html(page, props, build)
  };
  page.js = async (_, props) => await javascript(page, code, props);
  page.css = async (_, props) => await cascadingStyleSheets(page, props);
  page.middleware = (next) => (request, response) => {
    if (middleware) return middleware(request, next.bind(null, request, response), response.reject);
    if (page.inherited.middleware) return page.inherited.middleware.middleware(request, next.bind(null, request, response), response.reject);
    return next(request, response);
  };
  return page;
}

async function html(page, props, build) {
  const key = stringify(props);
  const html = page.cache.get("html." + key);
  const pathname = build ? page.pathname : page.location?.pathname;
  if (html) return html;
  window._page = page;
  let body;
  if (page.inherited.layout) body = renderToString(new Element(page.inherited.layout.layout.component, {}, new Element(page.content, props)));
  else body = renderToString(new Element(page.content, props));
  window._page = null;
  page.cache.reset("css");
  const stylesheet = await cascadingStyleSheets(page) ? `.${pathname + (pathname.endsWith("/") ? "" : "/")}${build ? "style.css" : "page.css"}` : null;
  const config = configs(page);
  return page.cache.set("html." + key,
    "<!doctype html>\n" +
    renderToString(
      new Element(
        "html",
        { lang: config?.lang || "en" },
        new Element(
          "head",
          null,
          new Element("title", null, config.title),
          new Element("meta", {
            name: "referrer",
            content: config?.referrer || "origin",
          }),
          new Element("meta", {
            name: "viewport",
            content:
              config?.viewport ||
              "width=device-width,initial-scale=1,minimum-scale=1.0",
          }),
          new Element("meta", {
            "http-equiv": "Content-Type",
            content: config?.contentType || "text/html; charset=utf-8",
          }),
          new Element("meta", {
            name: "description",
            content: config.description,
          }),
          new Element("meta", {
            name: "keywords",
            content: config.keywords,
          }),
          new Element("meta", {
            name: "theme-color",
            content: config.theme,
          }),
          new Element("meta", {
            httpEquiv: "Content-Security-Policy",
            content: `default-src 'self';script-src 'self';style-src 'self';`,
          }),
          new Element("meta", {
            name: "color-scheme",
            content: config.colorScheme || "light dark",
          }),
          new Element("meta", {
            name: "robots",
            content: config.robots,
          }),
          config?.author &&
          new Element("meta", {
            name: "author",
            content: config.author,
          }),
          config?.language &&
          new Element("meta", {
            name: "language",
            content: config.language,
          }),
          config?.refresh &&
          new Element("meta", {
            "http-equiv": "refresh",
            content: config.refresh,
          }),
          config?.revisitAfter &&
          new Element("meta", {
            name: "revisit-after",
            content: config.revisitAfter,
          }),
          page.pwa &&
          new Element("link", {
            rel: "manifest",
            href: `.${pathname + (pathname.endsWith("/") ? "" : "/")}manifest.json`,
          }),
          config?.icon &&
          new Element("link", {
            rel: "shortcut icon",
            href: config.icon,
          }),
          config?.icon &&
          new Element("link", {
            rel: "apple-touch-icon",
            href: config.icon,
          }),
          ...(config?.links?.map(
            (props) => new Element("link", props),
          ) || []),
          new Element("script", {
            src: `/${RESOURCES_PATH}/client.js`,
            defer: true,
          }),
          new Element("link", {
            rel: "stylesheet",
            href: `/${RESOURCES_PATH}/client.css`,
          }),
          stylesheet &&
          new Element("link", {
            rel: "preload",
            href: stylesheet,
            as: "style",
          }),
          stylesheet && new Element("link", {
            id: "app-style",
            rel: "stylesheet",
            href: stylesheet,
          }),
          ...(config?.scripts?.map(
            (props) => new Element("script", props),
          ) || []),
          ...(config?.styles?.map(
            ({ id }) =>
              new Element("link", { rel: "preload", href: `/${RESOURCES_PATH}/${id}.css`, as: "style" }),
          ) || []),
          ...(config?.styles?.map(
            ({ id }) => new Element("link", { rel: "stylesheet", href: `/${RESOURCES_PATH}/${id}.css` }),
          ) || []),
        ),
        new Element("body", {}, body),
      ),
    )
  );
}

async function javascript(page, code, props) {
  const key = stringify(props);
  const js = page.cache.get("js." + key);
  if (js) return js;
  let script = [code];
  if (page.inherited.layout)
    script.push(
      page.inherited.layout.layout.code,
      `const __app_layout = { pathname: "${page.inherited.layout.layout.pathname}" };`,
      "__app_layout.component = __app_layout_component?.default; export { __app_layout as layout };",
    );
  if (props)
    script.push(
      `const __app_props = ${stringify(props, IS_DEV)};`,
      "export { __app_props as props };",
    );
  script.push(
    `const __app_config = ${stringify(configs(page), IS_DEV)};`,
    "export { __app_config as config };",
  );
  return page.cache.set("js." + key, script.join(IS_DEV ? "\n" : " "));
}

async function cascadingStyleSheets(page) {
  const css = page.cache.get("css");
  if (css) return css;
  const len = page.styles.length;
  if (len == 0) return page.cache.set("css", null);
  let stylesheet = "";
  for (let i = 0; i < len; i++) stylesheet += `[scope-${page.styles[i]}] { ${page.resources[page.styles[i] + ".css"] || ""} }${IS_DEV ? "\n" : " "}`;
  stylesheet = (await compileSassString(stylesheet, { style: "compressed" })).css;
  const matches = stylesheet.match(new RegExp(`\\[scope-[^\\]]*\\] [^\\s]+(:root|:scope|:scoped)\\b`, "g"));
  for (let i = 0, len = matches?.length || 0; i < len; i++)
    stylesheet = stylesheet.replace(matches[i], m => {
      const [scope, query] = m.split(/ (.+)/);
      return query.replace(/:root|:scope|:scoped/g, scope);
    });
  return page.cache.set("css", stylesheet);
}

function configs(page) {
  const config = page.cache.get("config");
  if (config) return config;
  return page.cache.set("config", {
    title: "Vistta JS",
    description: "Page generated using VisttaJS",
    theme: "#ffffff",
    referrer: "origin",
    viewport: "width=device-width,initial-scale=1,minimum-scale=1.0",
    keywords: "visttajs",
    robots: "index, follow",
    ...Object.assign({}, ...page.inherited.configs.map(({ config }) => config)),
    ...page.config
  });
}

function cache() {
  const storage = {};
  return {
    get: (key) => storage[key],
    set: (key, value) => (storage[key] = value, value),
    reset: (key) => {
      if (key) delete storage[key];
      else Object.keys(storage).forEach(k => delete storage[k]);
    },
  }
}