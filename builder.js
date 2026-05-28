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
   * @param {string} path - Absolute or relative path to the service/controller file
   * @param {object} metadata
   * @param {string} [metadata.subdomain=""] - Subdomain for the API
   * @param {string} metadata.pathname - HTTP pathname for the API (e.g. "/api/users")
   */
  static registerAPI(path, metadata) {
    global.loaders.shared ??= {};
    global.loaders.shared[fs.resolve(path)] = metadata;
  }

  /**
   * Scan a directory for service.js files and auto-register them as APIs.
   *
   * @param {string} dir - Directory to scan (e.g. "./connect/components")
   * @param {object} [options]
   * @param {string} [options.subdomain=""] - Subdomain for all discovered APIs
   * @param {string} [options.basePath="/api"] - Base pathname prefix
   * @param {string} [options.pattern="service.js"] - Filename pattern to match
   * @returns {Promise<string[]>} Array of registered API paths
   */
  static async discoverAPIs(dir, { subdomain = "", basePath = "/api", pattern = "service.js" } = {}) {
    const registered = [];
    const resolvedDir = fs.resolve(dir);
    if (!fs.existsSync(resolvedDir)) return registered;

    const entries = await fs.readdir(resolvedDir);
    for (const name of entries) {
      const servicePath = fs.resolve(resolvedDir, name, pattern);
      if (fs.existsSync(servicePath)) {
        Builder.registerAPI(servicePath, {
          subdomain,
          pathname: `${ensureEndsWith(basePath, "/")}${name}`,
        });
        registered.push(servicePath);
      }
    }
    return registered;
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

    // Register pages (collect inherited configs and matching layout)
    for (let i = 0, len = entries.page.length; i < len; i++) {
      const [, pathname, filepath] = entries.page[i];

      // Collect inherited configs
      const configs = [{ config }];
      const segments = pathname.split("/");
      for (let j = 0, segLen = pathname === "/" ? 1 : segments.length; j < segLen; j++) {
        const prefix = segments.slice(0, j + 1).join("/") || "/";
        for (let k = 0, kLen = configs.length; k < kLen; k++) {
          if (configs[k].pathname === ensureEndsWith(prefix, "/")) {
            configs.push(configs[k]);
            break;
          }
        }
      }

      // Find matching layout (most specific prefix match)
      let layout = null;
      for (let j = 0, jLen = layouts.length; j < jLen; j++) {
        const layoutPathname = layouts[j].pathname;
        if (ensureEndsWith(pathname, "/").startsWith(layoutPathname)) {
          layout = layouts[j];
        }
      }

      const page = await createPage("page", filepath, pathname, layout ? { layout } : null, configs);
      if (page.resources) {
        const resourceKeys = Object.keys(page.resources);
        for (let i2 = 0, resourcesLen = resourceKeys.length; i2 < resourcesLen; i2++) {
          resources[`/${RESOURCES_PATH}/${resourceKeys[i2]}`] = page.resources[resourceKeys[i2]];
        }
      }
      pages.push(page);
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
      for (let i = 0, len = pages.length; i < len; i++) {
        const page = pages[i];
        if (page.pathname.includes(":")) continue;
        await fs.ensureDir(fs.resolve(output, "." + page.pathname));

        await createFile(page.pathname + "/index.html", await page.html({ headers: { host: "localhost" } }, {}, true));
        await createFile(page.pathname + "/page.js", await page.js({}, {}));
        result.routes.push({ pathname: page.pathname });
      }
    } else if (type === "app") {
      await fs.ensureDir(fs.resolve(output, "routes"));
      for (let i = 0, len = pages.length; i < len; i++) {
        const page = pages[i];
        if (page.pathname.includes(":")) continue;
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
