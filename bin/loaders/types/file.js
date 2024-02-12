import { fs } from "@vistta/utils/fs";

export default async function (source, { path }) {
  const urlHash = fs.fileId(path) + fs.extname(path);
  return {
    code: `export default "/resources/${urlHash}";`,
    resources: [{ path, hash: urlHash }]
  };
}
