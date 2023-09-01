const betterFetch = (url, options) => {
  if (typeof url === "object") (options = url), (url = options.url);
  let { controller, headers, method, params, timeout, type } = options || {};
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
        method: method,
        signal: controller.signal,
      });
      if (!response.ok)
        return resolve({ status: response.status, statusText: response.statusText, headers: response.headers });
      return resolve({
        data: await response[type || convertResponse(response.headers.get("content-type"))](),
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

export { betterFetch as fetch };

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
