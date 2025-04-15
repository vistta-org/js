import fs from "@vistta/fs";
import { Element, renderToString } from "./dom.js";
import { RESOURCES_PATH, stringify } from "../utils/index.js";

const IS_DEV = process.env.NODE_ENV === "development";

export async function createPage(
  type,
  filepath,
  pathname,
  inheritedConfigs,
  inheritedLayout
) {
  const { default: content, config } = await import(filepath);
  const pwa = config?.pwa;
  const { code, errors, resources } = await import(filepath, {
    with: { type: "bundler", exports: "default" },
  });
  const page = {
    type,
    pathname,
    config,
    content,
    resources,
    pwa,
    styleSheets: [],
    cache: cache(),
    inherited: {
      configs: inheritedConfigs || [],
      layout: inheritedLayout,
    },
  };
  if (errors?.length) throw new Error(errors[0]);
  if (!code || code === "") throw new Error("Unexpected Bundler Error");
  page.html = async (request, props, build) => {
    page.location = new URL(
      request.url,
      request.headers.referer || `http://${request.headers.host}/`
    );
    return await html(page, props, build);
  };
  page.js = async (_, props) => await javascript(page, code, props);
  page.manifest = async () => manifest(page);
  return page;
}

async function html(page, props, build) {
  const propsString = stringify(props);
  const html = page.cache.get("html." + propsString);
  const pathname = build ? page.pathname : page.location?.pathname;
  if (html) return html;
  window.page = page;
  let body;
  if (page.inherited.layout)
    body = renderToString(
      new Element(
        page.inherited.layout.layout.component,
        {},
        new Element(page.content, props)
      )
    );
  else body = renderToString(new Element(page.content, props));
  window.page = null;
  const config = configs(page);
  const head = [
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
  ];
  if (config?.author)
    head.push(
      new Element("meta", {
        name: "author",
        content: config.author,
      })
    );
  if (config?.language)
    head.push(
      new Element("meta", {
        name: "language",
        content: config.language,
      })
    );
  if (config?.refresh)
    head.push(
      new Element("meta", {
        "http-equiv": "refresh",
        content: config.refresh,
      })
    );
  if (config?.revisitAfter)
    head.push(
      new Element("meta", {
        name: "revisit-after",
        content: config.revisitAfter,
      })
    );
  if (page.pwa)
    head.push(
      new Element("link", {
        rel: "manifest",
        href: `.${pathname + (pathname.endsWith("/") ? "" : "/")}manifest.json`,
      })
    );
  if (config?.icon)
    head.push(
      new Element("link", {
        rel: "shortcut icon",
        href: config.icon,
      })
    );
  if (config?.icon)
    head.push(
      new Element("link", {
        rel: "apple-touch-icon",
        href: config.icon,
      })
    );
  for (let i = 0, len = config?.links?.length || 0; i < len; i++)
    head.push(new Element("link", config?.links[i]));
  for (let i = 0, len = config?.scripts?.length || 0; i < len; i++)
    head.push(new Element("script", config?.scripts[i]));
  for (let i = 0, len = config?.styles?.length || 0; i < len; i++) {
    const id = Object.keys(config.styles[i])[0].replace(/^style-/, "");
    head.push(
      new Element("link", {
        rel: "preload",
        href: `/${RESOURCES_PATH}/${id}.css`,
        as: "style",
      })
    );
    head.push(
      new Element("link", {
        rel: "stylesheet",
        href: `/${RESOURCES_PATH}/${id}.css`,
      })
    );
  }
  for (let i = 0, len = page.styleSheets?.length || 0; i < len; i++) {
    head.push(
      new Element("link", {
        rel: "preload",
        href: page.styleSheets[i],
        as: "style",
      })
    );
    head.push(
      new Element("link", { rel: "stylesheet", href: page.styleSheets[i] })
    );
  }
  return page.cache.set(
    "html." + propsString,
    "<!doctype html>\n" +
      renderToString(
        new Element(
          "html",
          { lang: config?.lang || "en" },
          new Element(
            "head",
            null,
            ...head,
            new Element("script", {
              src: `/${RESOURCES_PATH}/client.js`,
              defer: true,
            })
          ),
          new Element("body", {}, body)
        )
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
      "__app_layout.component = __app_layout_component?.default; export { __app_layout as layout };"
    );
  if (props)
    script.push(
      `const __app_props = ${stringify(props, IS_DEV)};`,
      "export { __app_props as props };"
    );
  script.push(
    `const __app_config = ${stringify(configs(page), IS_DEV)};`,
    "export { __app_config as config };"
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
    viewport: "width=device-width,initial-scale=1",
    keywords: "visttajs",
    robots: "index, follow",
    ...Object.assign({}, ...page.inherited.configs.map(({ config }) => config)),
    ...page.config,
  });
}

function manifest(page) {
  const config = configs(page);
  if (typeof config.manifest === "object")
    Object.assign(config, config.manifest);
  return JSON.stringify({
    id:
      config.id ||
      (config.name && config.version
        ? config.name + "_" + config.version
        : undefined),
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

function cache() {
  const storage = {};
  return {
    get: (key) => storage[key],
    set: (key, value) => ((storage[key] = value), value),
    reset: (key) => {
      if (key) delete storage[key];
      else Object.keys(storage).forEach((k) => delete storage[k]);
    },
  };
}
