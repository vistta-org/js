import fs from "@vistta/fs";
import { fileURLToPath } from "node:url";
import { createHtml, createPage } from "./core/page.js";
import { RESOURCES_PATH, checkIfMoreSpecific, ensureEndsWith, findRoutes } from "./utils/index.js";

const dirname = import.meta.dirname;

export class Builder {
  /**
   * Register an external API controller so the APILoader can resolve
   * `import ... with { type: "api" }` for files outside the build target.
   *
   * @param {string} path - Absolute or relative path to the controller file
   * @param {object} metadata
   * @param {string} [metadata.subdomain=""] - Subdomain for the API
   * @param {string} metadata.pathname - HTTP pathname for the API (e.g. "/api/users")
   */
  static registerAPI(path, metadata) {
    global.loaders.shared ??= {};
    global.loaders.shared[fs.resolve(path)] = metadata;
  }

  /**
   * @param {string} target - The target folder to build the static website or application to.
   * @param {object} [options] - Build options
   * @param {string} [options.output] - The output folder for the built files. Defaults to "dist".
   * @param {"web" | "app"} [options.type] - The type of build. Can be "web" for a web build or "app" for an application build.
   * @param {object} [options.config] - Additional configuration options to include in the build output. The contents of this object will be merged with the default configuration.
   * @return {Promise<{config: object, routes: any[], files: string[]}>} An object containing the final configuration used for the build, an array of all registered routes, and an array of all files included in the build.
   */
  static async build(target, options = {}) {
    const { type = "web", output = "dist", config = {} } = options;
    const result = { routes: [], files: [], config: {} };
    const apis = [];
    const resources = {};
    const configs = [];
    const layouts = [];
    const pages = [];
    const entries = await findRoutes(
      target,
      "/",
      {
        api: apis,
        controller: apis,
        middleware: [],
        page: [],
        error: [],
        config: [],
        layout: [],
      },
      resources,
    );

    // Populate shared state for api/controller entries so APILoader can resolve
    for (let i = 0, len = apis.length; i < len; i++) {
      const [, pathname, filepath] = apis[i];
      if (global.loaders?.shared) {
        const resolvedPath = fs.resolve(filepath);
        if (!global.loaders.shared[resolvedPath]) {
          global.loaders.shared[resolvedPath] = { subdomain: "", pathname: "/api" + pathname };
        }
      }
    }

    // Register configs (sorted by specificity)
    for (let i = 0, len = entries.config.length; i < len; i++) {
      const [, pathname, filepath] = entries.config[i];
      const { default: config } = await import(filepath);
      const configRoute = { pathname: ensureEndsWith(pathname, "/"), config };
      const segments = configRoute.pathname.split("/");
      let inserted = false;
      for (let j = 0, jLen = configs.length; j < jLen; j++) {
        if (checkIfMoreSpecific(segments, configs[j].pathname)) {
          configs.splice(j, 0, configRoute);
          inserted = true;
          break;
        }
      }
      if (!inserted) configs.push(configRoute);
    }

    // Register layouts (sorted by specificity)
    for (let i = 0, len = entries.layout.length; i < len; i++) {
      const [, pathname, filepath] = entries.layout[i];
      const {
        default: component,
        code,
        resources,
      } = await import(filepath, {
        with: { type: "bundler", globalName: "__app_layout_component", exports: "default" },
      });
      if (resources) {
        const resourceKeys = Object.keys(resources);
        for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++) {
          resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] = resources[resourceKeys[i2]];
        }
      }
      const layoutRoute = { pathname: ensureEndsWith(pathname, "/"), component, code };
      const segments = layoutRoute.pathname.split("/");
      let inserted = false;
      for (let j = 0, jLen = layouts.length; j < jLen; j++) {
        if (checkIfMoreSpecific(segments, layouts[j].pathname)) {
          layouts.splice(j, 0, layoutRoute);
          inserted = true;
          break;
        }
      }
      if (!inserted) layouts.push(layoutRoute);
    }

    // Register pages (matching layout; inherited configs are resolved after all pages are registered)
    for (let i = 0, len = entries.page.length; i < len; i++) {
      const [, pathname, filepath] = entries.page[i];

      // Find matching layout (most specific prefix match)
      let layout = null;
      for (let j = 0, jLen = layouts.length; j < jLen; j++) {
        const layoutPathname = layouts[j].pathname;
        if (ensureEndsWith(pathname, "/").startsWith(layoutPathname)) {
          layout = layouts[j];
        }
      }

      const inheritedConfigs = [];
      const page = await createPage("page", filepath, pathname, layout ? { layout } : null, inheritedConfigs);
      if (page.resources) {
        const resourceKeys = Object.keys(page.resources);
        for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++) {
          resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] = page.resources[resourceKeys[i2]];
        }
      }
      pages.push({ page, inheritedConfigs, catchAllParam: filepath.match(/\[\.\.\.([^\]]+)\]/)?.[1] });
    }

    // Resolve inherited configs for every page, shortest pathname first so ancestor
    // pages are merged before descendants: build options, then config route files and
    // ancestor page configs from the root down (most specific wins, like the server)
    const pageConfigs = new Map();
    const pageOrder = pages
      .map((_, index) => index)
      .sort((a, b) => pages[a].page.pathname.length - pages[b].page.pathname.length);
    for (let i = 0, len = pageOrder.length; i < len; i++) {
      const { page, inheritedConfigs } = pages[pageOrder[i]];
      const ownPathname = ensureEndsWith(page.pathname, "/");
      inheritedConfigs.push({ config });
      const segments = page.pathname.split("/");
      for (let j = 0, segLen = page.pathname === "/" ? 1 : segments.length; j < segLen; j++) {
        const prefix = ensureEndsWith(segments.slice(0, j + 1).join("/") || "/", "/");
        for (let k = 0, kLen = configs.length; k < kLen; k++) {
          if (configs[k].pathname === prefix) {
            inheritedConfigs.push(configs[k]);
            break;
          }
        }
        if (prefix === ownPathname) continue;
        const parentConfig = pageConfigs.get(prefix);
        if (parentConfig) inheritedConfigs.push({ config: parentConfig });
      }
      pageConfigs.set(ownPathname, page.config);
    }

    const createFile = async (file, content) => {
      const len = content.length;
      if (len === 0) return;
      const filepath = fs.resolve(output, "." + file);
      file = filepath.replace(fs.resolve(output), "");
      await fs.ensureDir(fs.dirname(filepath));
      await fs.writeFile(filepath, content);
      result.files.push({ filepath, len });
    };

    if (type === "web") {
      const outputs = new Map();
      const generated = [];
      for (const { page, catchAllParam } of pages) {
        let pathnames = [page.pathname];
        if (page.pathname.includes(":") || page.pathname.includes("*")) {
          const staticParams = page.static?.params;
          if (staticParams === undefined) {
            console.warn(`Skipping dynamic page ${page.pathname}: no config.static.params.`);
            continue;
          }
          const params = typeof staticParams === "function" ? await staticParams() : staticParams;
          if (!Array.isArray(params)) throw new Error(`config.static.params for ${page.pathname} must return an array.`);
          pathnames = params.map((entry) => staticPathname(page.pathname, entry, catchAllParam));
        }
        for (const pathname of pathnames) {
          const outputPath = fs.resolve(output, "." + ensureEndsWith(pathname, "/"));
          if (outputs.has(outputPath)) {
            throw new Error(`Duplicate output path ${pathname}: ${outputs.get(outputPath)} and ${page.pathname}`);
          }
          outputs.set(outputPath, page.pathname);
        }
        generated.push({ page, pathnames });
      }
      for (const { page, pathnames } of generated) {
        if (!pathnames.length) continue;
        const script = await page.js({}, {});
        for (const pathname of pathnames) {
          const prefix = ensureEndsWith(pathname, "/");
          await createFile(
            prefix + "index.html",
            await page.html({ url: pathname, headers: { host: "localhost" } }, {}, true),
          );
          await createFile(prefix + "page.js", script);
          result.routes.push({ pathname });
        }
      }
    } else if (type === "app") {
      await fs.ensureDir(fs.resolve(output, "routes"));
      for (let i = 0, len = pages.length; i < len; i++) {
        const { page } = pages[i];
        let name;
        if (page.pathname === "/") {
          name = "index";
          result.config = { ...page.config };
        } else
          name = page.pathname
            .slice(1)
            .replace(/\//g, "--")
            .replace(/[[\].:*]/g, "_");
        await createFile(`/routes/${name}.js`, await page.js({}, {}));
        result.routes.push({ name, pathname: page.pathname });
      }
      await createFile("/index.html", createHtml("", result.config));
    }

    if (type === "app") {
      let routes = "";
      for (let i = 0, len = result.routes.length; i < len; i++) {
        const { pathname, name } = result.routes[i];
        routes += `\t"${pathname}": () => import("../routes/${name}.js"),\n`;
      }
      await createFile(
        `/${RESOURCES_PATH}/client.js`,
        (
          await import(fs.resolve(dirname, "./clients/spa.js"), {
            with: { type: "bundler" },
          })
        )?.code.replace("APP_ROUTES", `{\n${routes}}`),
      );
    } else
      await createFile(
        `/${RESOURCES_PATH}/client.js`,
        (
          await import(fs.resolve(dirname, "./clients/ssg.js"), {
            with: { type: "bundler" },
          })
        )?.code,
      );
    const resourcesFilepaths = Object.keys(resources || {});
    await fs.ensureDir(fs.resolve(output, "./" + RESOURCES_PATH));
    for (let i = 0, len = resourcesFilepaths.length; i < len; i++) {
      const filepath = resourcesFilepaths[i];
      let content = resources[filepath];
      if (fs.isAbsolute(content)) content = await fs.readFile(content);
      await createFile(filepath, content);
    }

    await fs.ensureDir(fs.resolve(output, "./socket.io"));
    await fs.copyFile(
      fs.resolve(fileURLToPath(import.meta.resolve("socket.io")), "../client-dist/socket.io.esm.min.js"),
      fs.resolve(output, "./socket.io/socket.io.esm.min.js"),
    );
    return result;
  }
}

export default Builder;

function staticPathname(pattern, params, catchAllParam) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error(`config.static.params entries for ${pattern} must be parameter objects.`);
  }
  const segments = pattern.split("/").filter(Boolean);
  const result = [];
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    if (!segment.startsWith(":") && segment !== "*") {
      result.push(segment);
      continue;
    }
    const name = segment === "*" ? catchAllParam : segment.slice(1);
    const value = params[name];
    if (value === undefined && index === segments.length - 1) continue;
    if (segment === "*" && (typeof value === "string" || Array.isArray(value))) {
      const parts = (Array.isArray(value) ? value : [value]).flatMap((part) => {
        if (typeof part !== "string") throw new Error(`Invalid config.static.params parameter ${name} for ${pattern}.`);
        return part.split("/");
      });
      if (parts.some((part) => !part || part === "." || part === "..")) {
        throw new Error(`Invalid config.static.params parameter ${name} for ${pattern}.`);
      }
      result.push(...parts.map((part) => encodeURIComponent(part)));
    } else {
      if (
        segment === "*" ||
        !["string", "number"].includes(typeof value) ||
        value === "" ||
        value === "." ||
        value === ".."
      ) {
        throw new Error(`Missing or invalid config.static.params parameter ${name} for ${pattern}.`);
      }
      result.push(encodeURIComponent(value));
    }
  }
  return ensureEndsWith("/" + result.join("/"), "/");
}
