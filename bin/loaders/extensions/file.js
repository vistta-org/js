import { hash } from "../../../server/crypto/index.js";
import { fs } from "../../../server/filesystem/index.js";

export default function (source) {
  const urlHash = hash(source, "md5", "hex") + fs.extname(source);
  return { code: `export default "/resources/${urlHash}";`, resources: [{ path: source, hash: urlHash }] };
}
