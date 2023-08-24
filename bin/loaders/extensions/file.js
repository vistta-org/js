import { fs } from "../../../server/filesystem/index.js";

export default function (source) {
  const urlHash = fs.fileId(source) + fs.extname(source);
  return { code: `export default "/resources/${urlHash}";`, resources: [{ path: source, hash: urlHash }] };
}
