import fs from "@vistta/fs";
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
    styles: getPageStyles(resources, config),
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
  window.page = page;
  let body;
  if (page.inherited.layout) body = renderToString(new Element(page.inherited.layout.layout.component, {}, new Element(page.content, props)));
  else body = renderToString(new Element(page.content, props));
  window.page = null;
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
          ...convertStyles(page.styles.list, page.styles.preload, true),
          ...convertStyles(config?.styles),
          ...(config?.scripts?.map(
            (props) => new Element("script", props),
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

function getPageStyles(resources, { styles = [] } = {}) {
  resources = Object.keys(resources);
  const matchesConfigStyle = (id) => {
    for (let i = 0, len = styles.length; i < len; i++)
      if (styles[i].id === id) return true;
    return false;
  }
  const result = { list: [], preload: {} };
  for (let i = 0, len = resources.length; i < len; i++) {
    if (!resources[i].endsWith(".css")) continue;
    const id = resources[i].replace(/\.css$/, "");
    if (!matchesConfigStyle(id)) result.list.push({ id });
  }
  return result;
}

function convertStyles(styles, preload, scoped) {
  const elements = [];
  for (let i = 0, len = styles.length || 0; i < len; i++) {
    const id = styles[i].id;
    const scope = scoped ? { ["style-" + id]: true } : {};
    if (!scoped || preload[id]) elements.push(new Element("link", { rel: "preload", href: `/${RESOURCES_PATH}/${id}${scoped ? ".scoped" : ""}.css`, as: "style" }));
    elements.push(new Element("link", { rel: "stylesheet", href: `/${RESOURCES_PATH}/${id}${scoped ? ".scoped" : ""}.css`, ...scope }));
  }
  return elements;
}