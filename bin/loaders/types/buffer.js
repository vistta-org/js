import { fs } from "@vistta/utils/fs";

export default async function (source, { path }) {
  const urlHash = fs.fileId(path) + fs.extname(path);
  return {
    code: `const { data } = ${JSON.stringify(source)}; export default data;`,
    resources: [{ path, hash: urlHash }]
  };
}
