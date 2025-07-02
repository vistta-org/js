import "../../core/dom/adapter";
import { default as Controller, Method } from "../../server/controller";

export async function load(_, options) {
  try {
    if (!global.main.shared?.[options.path])
      throw new Error("Controller not found in the server shared state");
    const pathname = global.main.shared?.[options.path]?.pathname;
    let controller = (await import(options.path))?.default;
    let code = `import { request } from "@vistta/utils/request";const createUrl = (url) => [`;
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
    code += `url].map((u) => u.replace(/(^\\/|\\/$)/g, "")).filter(Boolean).join("/");`;
    if (Object.prototype.isPrototypeOf.call(Controller, controller)) {
      controller = new controller({ on() {}, emit() {} });
      const keys = Object.keys(controller);
      for (let i = 0, len = keys?.length || 0; i < len; i++) {
        const exportName = keys[i];
        const cur = controller[exportName];
        if (!(cur instanceof Method)) continue;
        code += `export const ${exportName} = ${convertMethodToRequest(cur)};`;
      }
      return { code };
    } else if (controller instanceof Method) {
      code += `export default ${convertMethodToRequest(controller)};`;
      return { code };
    } else
      throw new Error(
        `Invalid api format. Export default must be either a Method or a class Controller from '@vistta/js'`
      );
  } catch (e) {
    return { errors: [`${options.path}(0,0): api error: ${e.message}.`] };
  }
}

//

function convertMethodToRequest(method) {
  const arg =
    method.type === "get" || method.type === "delete" ? "params" : "body";
  return `(${arg}) => request.${method.type}(createUrl("${method.url}"), { ${arg} })`;
}
