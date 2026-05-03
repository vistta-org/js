import { Loader } from "@vistta/cli";
import "../../core/adapter.js";
import { stringify } from "../../utils/index.js";
import { default as Controller, RESTMethod } from "../../web/server/controller.js";

export default class APILoader extends Loader {
  async load(_, options) {
    try {
      if (!global.main.shared?.[options.path]) throw new Error("Controller not found in the server shared state");
      const pathname = global.main.shared?.[options.path]?.pathname;
      let controller = (await import(options.path))?.default;
      let code = `import { request } from "@vistta/utils/request";const createUrl = (...url) => [`;
      if (options.pathname || options.bundler) code += `"${pathname}",`;
      else {
        const escapePath = stringify(options.path);
        if (options.subdomain) {
          if (options.subdomain === "")
            code += `(global.main.shared.host.protocol+"://localhost:"+global.main.shared.host.port),`;
          else
            code += `(global.main.shared.host.protocol+"://${options.subdomain}.localhost:"+global.main.shared.host.port),`;
        } else
          code += `(global.main.shared.host.protocol+"://"+(global.main.shared?.[${escapePath}]?.subdomain!==""?(global.main.shared[${escapePath}].subdomain+"."):"")+"localhost:"+global.main.shared.host.port),`;
        code += `global.main.shared?.[${escapePath}]?.pathname || "",`;
      }
      code += `...url].reduce((acc, v) => v == null || v.toString() === "" ? acc : acc + "/" + v.toString(), "").replace(/\\/+/g, "/").replace(/\\/$/g, "");`;
      if (Object.prototype.isPrototypeOf.call(Controller, controller)) {
        const keys = Object.keys(controller);
        code += "export default {";
        for (let i = 0, len = keys?.length || 0; i < len; i++) {
          const exportName = keys[i];
          const cur = controller[exportName];
          if (!(cur instanceof RESTMethod)) continue;
          code += ` ${exportName}: ${convertRESTMethodToRequest(cur)},`;
        }
        code += "};";
        return { code };
      } else if (controller instanceof RESTMethod) {
        code += `export default ${convertRESTMethodToRequest(controller)};`;
        return { code };
      } else
        throw new Error(
          `Invalid api format. Export default must be either a RESTMethod or a class Controller from '@vistta/js'`,
        );
    } catch (e) {
      return { errors: [`${options.path}(0,0): api error: ${e.message}.`] };
    }
  }
}

//

function convertRESTMethodToRequest(method) {
  const params = [];
  const parts = [];
  let last = 0;
  let param = false;
  for (let i = 0, len = method.url.length; i < len; i++) {
    if (method.url[i] === ":") {
      parts.push(`"${method.url.slice(last, i)}"`);
      last = i + 1;
      param = true;
    } else if (param && method.url[i] === "/") {
      const name = method.url.slice(last, i);
      params.push(name);
      parts.push(name + " ?? ''");
      last = i;
      param = false;
    }
  }
  if (last < method.url.length) {
    if (param) {
      const name = method.url.slice(last);
      params.push(name);
      parts.push(name + " ?? ''");
    } else parts.push(`"${method.url.slice(last)}"`);
  }

  const arg = method.type === "get" || method.type === "delete" ? "params" : "body";
  let fetchExpr;
  if (params.length == 0)
    fetchExpr = `request.${method.type}(createUrl("${method.url}"), { ${arg}, controller }).then((response) => response?.data)`;
  else
    fetchExpr = `request.${method.type}(createUrl(${parts.join(", ")}), { ${arg}, controller }).then((response) => response?.data)`;

  if (!method.cache) {
    if (params.length == 0) return `({ ...${arg} } = {}, controller) => ${fetchExpr}`;
    return `({ ${params.join(", ")}, ...${arg} } = {}, controller) => ${fetchExpr}`;
  }

  const allParams = params.length == 0 ? `{ ...${arg} } = {}` : `{ ${params.join(", ")}, ...${arg} } = {}`;
  const keyExpr = params.length == 0 ? arg : `{ ${params.join(", ")}, ...${arg} }`;
  return `(() => {
  const _name = "/_cache/${method.type}${method.url}";
  const _ttl = ${method.cache * 1000};
  const _toUrl = (key) => _name + "?" + encodeURIComponent(JSON.stringify(key));
  const fn = async (${allParams}, controller) => {
    const _key = ${keyExpr};
    const _url = _toUrl(_key);
    if (typeof caches !== "undefined") {
      const _c = await caches.open("api");
      const _r = await _c.match(_url);
      if (_r) {
        const _t = Number(_r.headers.get("X-Cache-Time"));
        if (Date.now() - _t < _ttl) return _r.json();
      }
    }
    const _d = await ${fetchExpr};
    if (typeof caches !== "undefined") {
      const _c = await caches.open("api");
      await _c.put(_url, new Response(JSON.stringify(_d), { headers: { "Content-Type": "application/json", "X-Cache-Time": String(Date.now()) } }));
    }
    return _d;
  };
  fn.invalidate = async (key) => {
    if (typeof caches === "undefined") return;
    const _c = await caches.open("api");
    if (key != null) await _c.delete(_toUrl(key));
    else { const _keys = await _c.keys(); for (const _r of _keys) if (_r.url.includes(_name)) await _c.delete(_r); }
  };
  return fn;
})()`;
}
