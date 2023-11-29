import { fs } from "@vistta/utils/fs";

export default function (source, { path }) {
  const urlHash = fs.fileId(path) + fs.extname(path);
  return {
    code: `export default "/resources/${urlHash}";` + `export const buffer = (${JSON.stringify(source)}).data;`,
    resources: [{ path, hash: urlHash }]
  };
}
