import path from "node:path";

export type fs = {
  resolve: typeof path.resolve;
  extname: typeof path.extname;
  basename: typeof path.basename;
  isAbsolute: typeof path.isAbsolute;
  filename: (input: string) => string;
  dirname: (input) => string;
  isDirectory: (path: string) => boolean;
  isFile: (path: string) => boolean;
  // TODO watch & rest of fs function
};
