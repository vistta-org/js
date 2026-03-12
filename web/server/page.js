import fs from "@vistta/fs";
import { RESOURCES_PATH, stringify } from "../../utils/index.js";
import { Component, Element, VirtualDom } from "./dom.js";

const IS_DEV = process.env.NODE_ENV === "development";
const DEFAULT_CSP = {
  "style-src": ["'unsafe-inline'"],
  "img-src": ["data:"],
};

export async function createPage(type, filepath, pathname, layout, configs) {
  const { default: content, config } = await import(filepath);
  const { code, errors, resources } = await import(filepath, {
    with: { type: "bundler", exports: "default" },
  });
  if (errors?.length) throw new Error(errors[0]);
  if (!code || code === "") throw new Error("Unexpected Bundler Error");
  return {
    type,
    pathname,
    get config() {
      return {
        title: "Vistta JS",
        description: "Page generated using VisttaJS",
        theme: "#ffffff",
        referrer: "origin",
        keywords: "visttajs",
        robots: "index, follow",
        ...this.inherited.configs.reduce((acc, { config }) => Object.assign(acc, config || {}), {}),
        ...config,
      };
    },
    content,
    resources,
    get pwa() {
      return !!this.config.pwa;
    },
    cache: cache(),
    inherited: {
      configs,
      layout,
    },
    async html(request, props, build) {
      this.location = new URL(request.url, request.headers.referer || `http://${request.headers.host}/`);
      const key = "html." + stringify(props);
      let html = this.cache.get(key);
      if (!html) {
        const config = this.config;
        /** @type {any} */ (window).page = this;
        const virtualDom = new VirtualDom(config);
        if (this.inherited.layout)
          virtualDom.render(new Element(this.inherited.layout.layout.component, {}, new Element(content, props)));
        else virtualDom.render(new Element(content, props));
        /** @type {any} */ (window).page = null;
        const pathname = build ? this.pathname : this.location?.pathname;
        html = `<!doctype html>
        <html lang="${config?.lang || "en"}">
          <head>
            <title>${config.title}</title>
            <meta referrer="${config.referrer || "origin"}" />
            <meta http-equiv="Content-Type" content="${config.contentType || "text/html; charset=utf-8"}" />
            <meta name="viewport" content="${config?.viewport || "width=device-width,initial-scale=1" + (this.pwa ? ",interactive-widget=resizes-content,viewport-fit=cover" : "")}" />
            <meta http-equiv="Content-Security-Policy" content="${convertCSP(config?.csp)}" />
            <meta name="description" content="${config.description || ""}" />
            <meta name="color-scheme" content="${config.colorScheme || "light dark"}" />
            <meta name="theme-color" content="${config.theme || "#ffffff"}" />
            <meta name="keywords" content="${config.keywords || ""}" />
            <meta name="robots" content="${config.robots || "index, follow"}" />
            ${config.author ? `<meta name="author" content="${config.author}" />` : ""}
            ${config.language ? `<meta name="language" content="${config.language}" />` : ""}
            ${config.refresh ? `<meta http-equiv="refresh" content="${config.refresh}" />` : ""}
            ${config.revisitAfter ? `<meta name="revisit-after" content="${config.revisitAfter}" />` : ""}
            ${config.copyright ? `<meta name="copyright" content="${config.copyright}" />` : ""}
            ${config.publisher ? `<meta name="publisher" content="${config.publisher}" />` : ""}
            ${config.icon ? `<link rel="icon" href="${config.icon}" />` : ""}
            ${config.icon ? `<link rel="apple-touch-icon" href="${config.icon}" />` : ""}
            ${this.pwa ? `<link rel="manifest" href=".${pathname + (pathname.endsWith("/") ? "" : "/")}manifest.json" />` : ""}
            <style data-ssr>${Array.from(virtualDom.stylesheet.rules).join(" ")}</style>
            ${config.links?.reduce((acc, obj) => acc + `\n\t<link ${convertToAttributes(obj)} />`, "") || ""}
            <script src="./${RESOURCES_PATH}/client.js" defer></script>
          </head>
          <body>
            ${virtualDom.host.innerHTML}
          </body>
        </html>`.replace(/^\s*\n|^ {8}/gm, "");
        this.cache.set(key, html);
      }
      return html;
    },
    async js(req, props) {
      const key = stringify(props);
      const js = this.cache.get("js." + key);
      if (js) return js;
      let script = [code];
      if (this.inherited.layout)
        script.push(
          this.inherited.layout.layout.code,
          `const __app_layout = { pathname: "${this.inherited.layout.layout.pathname}" };`,
          "__app_layout.component = __app_layout_component?.default; export { __app_layout as layout };",
        );
      if (props) script.push(`const __app_props = ${stringify(props, IS_DEV)};`, "export { __app_props as props };");
      script.push(`const __app_config = ${stringify(this.config, IS_DEV)};`, "export { __app_config as config };");
      return this.cache.set("js." + key, script.join(IS_DEV ? "\n" : " "));
    },
    // eslint-disable-next-line no-unused-vars
    async manifest(req, props) {
      const manifest = this.cache.get("manifest");
      if (manifest) return manifest;
      const config =
        typeof this.config.manifest === "object" ? Object.assign({}, this.config.manifest, this.config) : this.config;
      return this.cache.set(
        "manifest",
        JSON.stringify({
          id: config.id || (config.name && config.version ? config.name + "_" + config.version : undefined),
          theme_color: config.theme,
          background_color: config.background,
          display: config.display || "standalone",
          scope: config.scope || config.href,
          start_url: config.start_url || config.href || "/",
          name: config.name || config.title,
          short_name: config.short_name || config.title,
          description: config.description,
          shortcuts: config.shortcuts,
          screenshots: config.screenshots,
          launch_handler: config.launch_handler || { client_mode: "focus-existing" },
          file_handlers: config.file_handlers,
          icons: ((icon) => {
            if (!icon) return [];
            console.log("icon", resources[fs.basename(icon)]);
            // CHATGPT no dependency for any image type
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
        }),
      );
    },
  };
}

export { Component, Element };

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

function convertCSP(target) {
  const csp = Object.assign({}, DEFAULT_CSP);
  const typeOf = typeof target;
  if (typeOf === "string") {
    const directives = target.split(";");
    target = {};
    for (let i = 0, len = directives.length; i < len; i++) {
      const directive = directives[i].trim();
      if (directive === "") continue;
      const [key, ...values] = directive.split(" ").map((v) => v.trim());
      if (key && values.length) target[key] = values;
    }
  } else if (typeOf !== "object") target = {};
  const keys = Array.from(new Set([...Object.keys(csp), ...Object.keys(target)]));
  if (keys.length === 0) return DEFAULT_CSP;
  let result = "default-src 'self'; ";
  for (let i = 0, len = keys.length; i < len; i++) {
    const key = keys[i];
    if (key === "default-src") continue;
    const value = ["'self'"];
    if (csp[key]) value.push(...(!Array.isArray(csp[key]) ? csp[key].split(" ") : csp[key]));
    if (target[key]) value.push(...(!Array.isArray(target[key]) ? target[key].split(" ") : target[key]));
    result += key + " " + Array.from(new Set(value)).join(" ") + "; ";
  }
  return result;
}

function convertToAttributes(obj) {
  if (!obj || typeof obj !== "object") return "";
  return Object.keys(obj)
    .map((key) => `${key}="${obj[key]}"`)
    .join(" ");
}
