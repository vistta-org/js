const request = (...args) => {
  let options = {}
  if (args.length === 1 && typeof args[0] === "string") options.url = args[0];
  else if (args.length === 1 && typeof args[0] === "object") options = args[0];
  else if (args.length === 2 && typeof args[1] === "string") options.url = args[1], options.method = args[0];
  else if (args.length === 2 && typeof args[1] === "object") options = args[1], options.method = args[0];
  else if (args.length === 3) options.params = args[2], options.url = args[1], options.method = args[0];
  else throw "Invalid Arguments";
  let { url, controller, headers, method, params, timeout, content } = options || {};
  if (!controller) controller = new AbortController();
  const { body, contentType } = transformBody(options?.body);
  // eslint-disable-next-line no-async-promise-executor
  const response = new Promise(async (resolve) => {
    headers = await buildHeaders(url, headers, contentType, method);
    if (params) params = new URLSearchParams(params);
    timeout = timeout ? setTimeout(() => controller.abort(), timeout) : undefined;
    try {
      const response = await fetch(params ? `${url}?${params.toString()}` : url, {
        ...options,
        headers: headers,
        body: body,
        method: method?.toUpperCase() || "GET",
        signal: controller.signal,
      });
      if (!response.ok)
        return resolve({ status: response.status, statusText: response.statusText, headers: response.headers });
      return resolve({
        data: await response[content || convertResponse(response.headers.get("content-type"))](),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      if (!controller.signal.aborted) return resolve({ error });
    } finally {
      clearTimeout(timeout);
    }
  });
  response.abort = () => controller.abort();
  return response;
};

request.get = request.bind(null, "get");
request.post = request.bind(null, "post");
request.head = request.bind(null, "head");
request.put = request.bind(null, "put");
request.delete = request.bind(null, "delete");
request.connect = request.bind(null, "connect");
request.options = request.bind(null, "options");
request.trace = request.bind(null, "trace");
request.patch = request.bind(null, "patch");

export { request };

//

function transformBody(body) {
  if (body instanceof FormData) return { body: body, contentType: "auto" };
  return { body: JSON.stringify(body), contentType: "default" };
}

async function buildHeaders(url, headers, contentType, method) {
  if (!(headers instanceof Headers)) headers = new Headers(typeof headers === "object" ? headers : {});
  headers.append("accept", "application/json, text/plain, */*");
  headers.append("path", url);
  headers.append("method", method || "GET");
  headers.append("sec-fetch-mode", "cors");
  headers.append("sec-fetch-site", "same-origin");
  if (contentType !== "auto" && !headers.get("Content-Type"))
    headers.append("Content-Type", contentType !== "default" ? contentType : "application/json");
  return headers;
}

function convertResponse(contentType) {
  if (typeof contentType !== "string") return "blob";
  if (contentType.includes("application/json")) return "json";
  if (contentType.includes("application/octet-stream")) return "arrayBuffer";
  if (contentType.includes("multipart/form-data")) return "formData";
  if (contentType.includes("text/")) return "text";
  return "blob";
}
