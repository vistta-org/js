import fs from "@vistta/fs";
import { default as Controller, Method } from "../../server/controller";

export async function load(_, options) {
  try {
    if (!options.baseUrl) {
      const { cwd, basepath } = global.main.shared?.use || {};
      options.baseUrl = combinePathnames(fs.dirname(options.path).replace(cwd, "/"), basepath);
    }
    let controller = (await import(options.path))?.default;
    let code = `import { request } from "@vistta/utils/request";`;
    if (Object.prototype.isPrototypeOf.call(Controller, controller)) {
      controller = new controller({ on() { }, emit() { } });
      const keys = Object.keys(controller);
      for (let i = 0, len = keys?.length || 0; i < len; i++) {
        const exportName = keys[i];
        const cur = controller[exportName];
        if (!(cur instanceof Method)) continue;
        code += `export const ${exportName} = ${convertMethodToRequest(options.baseUrl, cur, options)};`;
      }
      return { code };
    }
    else if (controller instanceof Method) {
      code += `export default ${convertMethodToRequest(options.baseUrl, controller, options)};`
      return { code };
    }
    else throw new Error(`Invalid api format. Export default must be either a Method or a class Controller from '@vistta/js'`);
  } catch (e) {
    return { errors: [`${options.path}(0,0): api error: ${e.message}.`] };
  }
}

//

function convertMethodToRequest(baseUrl, method, options) {
  return `(body) => request.${method.type}("${combinePathnames((options.bundler ? "" : global.main.shared.host), baseUrl, method.url)}", { body })`;
}

function combinePathnames(...paths) {
  return paths
      .map(path => path.replace(/(^\/+|\/+$)/g, "")) // Remove leading and trailing slashes
      .filter(Boolean) // Remove empty strings
      .join("/");
}