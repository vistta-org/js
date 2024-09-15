import { default as Controller, Method } from "../../server/controller";

export async function load(_, options) {
  try {
    const baseUrl = options.path.replace(/.*\\api/, "\\api").replace(/\\/g, "/").split(".")[0];
    let controller = (await import(options.path))?.default;
    let code = `import { request } from "@vistta/utils/request";`;
    if (Object.prototype.isPrototypeOf.call(Controller, controller)) {
      controller = new controller({ on() { }, emit() { } });
      const keys = Object.keys(controller);
      for (let i = 0, len = keys?.length || 0; i < len; i++) {
        const exportName = keys[i];
        const cur = controller[exportName];
        if (!(cur instanceof Method)) continue;
        code += `export const ${exportName} = ${convertMethodToRequest(baseUrl, cur)};`;
      }
      return { code };
    }
    else if (controller instanceof Method) {
      code += `export default ${convertMethodToRequest(baseUrl, controller)};`
      return { code };
    }
    else throw new Error(`Invalid api format. Export default must be either a Method or a class Controller from '@vistta/js'`);
  } catch (e) {
    return { errors: [`${options.path}(0,0): api error: ${e.message}.`] };
  }
}

//

function convertMethodToRequest(baseUrl, method) {
  return `(body) => request.${method.type}("${baseUrl + (method.url !== "/" ? method.url : "")}", { body })`
}