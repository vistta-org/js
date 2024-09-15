import fs from "@vistta/fs";
import { RESOURCES_PATH } from "../../utils/index.js";

export async function load(_, { path, type, encoding }) {
  const urlHash = fs.fileId(path) + fs.extname(path);
  if (type === "reader")
    return {
      code: `export default ${JSON.stringify(await fs.readFile(path, encoding || "utf8"))}`,
      resources: [{ path, hash: urlHash }],
    };
  return {
    code: `export default "${RESOURCES_PATH}/${urlHash}";`,
    resources: [{ path, hash: urlHash }],
  };
}
