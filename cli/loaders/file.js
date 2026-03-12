import { Loader } from "@vistta/cli";
import fs from "@vistta/fs";
import { pathToFileURL } from "node:url";
import { RESOURCES_PATH } from "../../utils/index.js";

export default class FileLoader extends Loader {
  async load(_, { path, type, encoding, app }) {
    const urlHash = fs.fileId(path) + fs.extname(path);
    if (type === "reader")
      return {
        code: `export default ${JSON.stringify(await fs.readFile(path, encoding || "utf8"))}`,
        resources: [{ path, hash: urlHash }],
      };
    if (app)
      return {
        code: `export default "${pathToFileURL(path).href}";`,
        resources: [{ path, hash: urlHash }],
      };
    return {
      code: `export default "./${RESOURCES_PATH}/${urlHash}";`,
      resources: [{ path, hash: urlHash }],
    };
  }
}
