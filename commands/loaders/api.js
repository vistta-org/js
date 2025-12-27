import { Loader } from "@vistta/cli";
import "../../core/adapter.js";
import { default as Controller, Method } from "../../web/server/controller.js";

const PARAMS_REGEX = /:(\w+)/g;

export default class APILoader extends Loader {
  async load(_, options) {
    try {
      if (!global.main.shared?.[options.path]) throw new Error("Controller not found in the server shared state");
      const pathname = global.main.shared?.[options.path]?.pathname;
      let controller = (await import(options.path))?.default;
      let code = `import { request } from "@vistta/utils/request";const createUrl = (...url) => [`;
      if (options.pathname || options.bundler) code += `"${pathname}",`;
      else {
        if (options.subdomain) {
          if (options.subdomain === "")
            code += `(global.main.shared.host.protocol+"://localhost:"+global.main.shared.host.port),`;
          else
            code += `(global.main.shared.host.protocol+"://${options.subdomain}.localhost:"+global.main.shared.host.port),`;
        } else
          code += `(global.main.shared.host.protocol+"://"+(global.main.shared?.["${options.path}"]?.subdomain!==""?(global.main.shared["${options.path}"].subdomain+"."):"")+"localhost:"+global.main.shared.host.port),`;
        code += `global.main.shared?.["${options.path}"]?.pathname || "",`;
      }
      code += `...url].reduce((acc, v) => v == null || v.toString() === "" ? acc : acc + "/" + v.toString(), "").replace(/\\/+/g, "/").replace(/\\/$/g, "");`;
      if (Object.prototype.isPrototypeOf.call(Controller, controller)) {
        controller = new controller({ on() {}, emit() {} });
        const keys = Object.keys(controller);
        code += "export default {";
        for (let i = 0, len = keys?.length || 0; i < len; i++) {
          const exportName = keys[i];
          const cur = controller[exportName];
          if (!(cur instanceof Method)) continue;
          code += ` ${exportName}: ${convertMethodToRequest(cur)},`;
        }
        code += "};";
        return { code };
      } else if (controller instanceof Method) {
        code += `export default ${convertMethodToRequest(controller)};`;
        return { code };
      } else
        throw new Error(
          `Invalid api format. Export default must be either a Method or a class Controller from '@vistta/js'`,
        );
    } catch (e) {
      return { errors: [`${options.path}(0,0): api error: ${e.message}.`] };
    }
  }
}

//

function convertMethodToRequest(method) {
  let match;
  let target = method.url;
  const params = [];
  const parts = [];
  while ((match = PARAMS_REGEX.exec(target)) !== null) {
    params.push(match[1]);
    const [url, remaining] = target.split(":" + match[1]);
    parts.push(`"${url}"`, match[1] + " ?? ''");
    target = remaining;
  }
  if (target.length > 0) parts.push(`"${target}"`);
  const arg = method.type === "get" || method.type === "delete" ? "params" : "body";
  if (params.length == 0) return `(${arg}) => request.${method.type}(createUrl("${method.url}"), { ${arg} })`;
  return `({ ${params.join(", ")}, ...${arg} } = {}) => request.${method.type}(createUrl(${parts.join(", ")}), { ${arg} })`;
}
