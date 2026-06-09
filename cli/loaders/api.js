import { Loader } from "@vistta/cli";
import "../../core/adapter.js";
import { default as Controller, RESTMethod } from "../../server/controller.js";
import { stringify } from "../../utils/index.js";

const global = /** @type {any} */ globalThis;

export default class APILoader extends Loader {
  async load(_, options) {
    try {
      if (/aida[\\/]service|bookmarks[\\/]service/.test(options.path || ""))
        console.debug(
          "[api.load] path =",
          options.path,
          "| sharedHasIt =",
          !!global.main.shared?.[options.path],
          "| bundler =",
          !!options.bundler,
          "| pathname =",
          !!options.pathname,
        );
      if (!global.main.shared?.[options.path]) {
        return { code: "export default {};" };
      }
      const pathname = global.main.shared?.[options.path]?.pathname;
      let controller = (await import(options.path))?.default;
      let code = `import { request } from "@vistta/utils/request";const createUrl = (...url) => (vistta.host || "") + [`;
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
  const urlExpr = params.length === 0 ? `createUrl("${method.url}")` : `createUrl(${parts.join(", ")})`;
  const allParams = params.length === 0 ? `{ ...${arg} } = {}` : `{ ${params.join(", ")}, ...${arg} } = {}`;
  const urlFn = `(${allParams}) => { const _u = ${urlExpr}; const _t = typeof request !== "undefined" && request.getAuthorization ? request.getAuthorization() : null; return _t ? _u + (_u.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(_t) : _u; }`;

  const fetchExpr = `request.${method.type}(_path, { ${arg}, controller }).then((response) => response?.data)`;

  // No cache — passthrough.
  if (!method.cache) {
    if (params.length === 0)
      return `Object.assign(({ ...${arg} } = {}, controller) => { const _path = ${urlExpr}; return ${fetchExpr}; }, { url: ${urlFn} })`;
    return `Object.assign(({ ${params.join(", ")}, ...${arg} } = {}, controller) => { const _path = ${urlExpr}; return ${fetchExpr}; }, { url: ${urlFn} })`;
  }

  // Cache only meaningful for GET-like requests; body methods bypass cache.
  if (arg !== "params") {
    if (params.length === 0)
      return `Object.assign(({ ...${arg} } = {}, controller) => { const _path = ${urlExpr}; return ${fetchExpr}; }, { url: ${urlFn} })`;
    return `Object.assign(({ ${params.join(", ")}, ...${arg} } = {}, controller) => { const _path = ${urlExpr}; return ${fetchExpr}; }, { url: ${urlFn} })`;
  }

  const ttl = method.cache.ttl * 1000;
  const swr = method.cache.swr;
  const cacheName = `api:${method.type}:${method.url}`;

  return `(() => {
  const _cacheName = ${stringify(cacheName)};
  const _ttl = ${ttl};
  const _swr = ${swr ? "true" : "false"};
  const _buildKey = (_path, _params) => {
    const _q = new URLSearchParams(_params).toString();
    return _q ? _path + "?" + _q : _path;
  };
  const _writeCache = async (_key, _data) => {
    if (typeof caches === "undefined") return;
    const _c = await caches.open(_cacheName);
    await _c.put(_key, new Response(JSON.stringify(_data), {
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Time": String(Date.now()),
        "X-Cache-TTL": String(_ttl),
      },
    }));
  };
  const _revalidate = (_key, fetcher) => fetcher().then((_d) => _writeCache(_key, _d)).catch(() => {});
  const fn = async (${allParams}, controller, _options) => {
    const _path = ${urlExpr};
    const _key = _buildKey(_path, ${arg});
    const _bypass = _options && _options.cache === false;
    const _force = _options && _options.cache && _options.cache.force === true;
    const _doFetch = () => ${fetchExpr};
    if (_bypass) return _doFetch();
    if (_force) {
      const _d = await _doFetch();
      await _writeCache(_key, _d);
      return _d;
    }
    if (typeof caches !== "undefined") {
      const _c = await caches.open(_cacheName);
      const _r = await _c.match(_key);
      if (_r) {
        const _t = Number(_r.headers.get("X-Cache-Time"));
        const _fresh = Date.now() - _t < _ttl;
        if (_fresh) return _r.json();
        if (_swr) {
          _revalidate(_key, _doFetch);
          return _r.json();
        }
      }
    }
    const _d = await _doFetch();
    await _writeCache(_key, _d);
    return _d;
  };
  fn.invalidate = async (key) => {
    if (typeof caches === "undefined") return;
    if (key == null) { await caches.delete(_cacheName); return; }
    const { ${params.join(", ")}${params.length ? ", " : ""}...rest } = key;
    const _path = ${urlExpr};
    const _key = _buildKey(_path, rest);
    const _c = await caches.open(_cacheName);
    await _c.delete(_key);
  };
  fn.invalidate.all = async () => {
    if (typeof caches === "undefined") return;
    await caches.delete(_cacheName);
  };
  fn.url = ${urlFn};
  return fn;
})()`;
}
