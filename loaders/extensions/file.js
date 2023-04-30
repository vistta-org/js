import { hash } from "../../server/lib/crypto.js";
import { fs } from "../../server/lib/filesystem.js";

export default function (source) {
  const urlHash = hash(source, "md5", "hex") + fs.extname(source);
  return { code: `export default "/resources/${urlHash}";`, resources: [{ path: source, hash: urlHash }] };
}
