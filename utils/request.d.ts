type Response = {
  data: any;
  status: number;
  statusText: string;
  headers: Headers;
};

interface Options extends Omit<RequestInit, "signal" | "body"> {
  url?: string;
  controller?: AbortController;
  params?: { [key: string]: string };
  content?: "blob" | "json" | "arrayBuffer" | "formData" | "text";
  timeout?: number;
  body?: BodyInit | object;
}

export const request: {
  (method: string, url: string, params?: { [key: string]: string }): Response;
  (method: string, options: Omit<Options, "method">): Response;
  (options: Options): Response;
  (url: string): Response;
  //
  get(url: string, params?: { [key: string]: string }): Response;
  get(options: Omit<Options, "method">): Response;
  post(url: string, params?: { [key: string]: string }): Response;
  post(options: Omit<Options, "method">): Response;
  head(url: string, params?: { [key: string]: string }): Response;
  head(options: Omit<Options, "method">): Response;
  put(url: string, params?: { [key: string]: string }): Response;
  put(options: Omit<Options, "method">): Response;
  delete(url: string, params?: { [key: string]: string }): Response;
  delete(options: Omit<Options, "method">): Response;
  connect(url: string, params?: { [key: string]: string }): Response;
  connect(options: Omit<Options, "method">): Response;
  options(url: string, params?: { [key: string]: string }): Response;
  options(options: Omit<Options, "method">): Response;
  trace(url: string, params?: { [key: string]: string }): Response;
  trace(options: Omit<Options, "method">): Response;
  patch(url: string, params?: { [key: string]: string }): Response;
  patch(options: Omit<Options, "method">): Response;
};
