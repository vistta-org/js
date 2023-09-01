type Response = {
  data: any;
  status: number;
  statusText: string;
  headers: Headers;
};

interface Options extends Omit<RequestInit, "signal"> {
  url?: string;
  controller?: AbortController;
  params?: { [key: string]: string };
  type?: "blob" | "json" | "arrayBuffer" | "formData" | "text";
  timeout?: number;
}

export function fetch(url: string, options?: Options): Response;
export function fetch(options: Options): Response;
