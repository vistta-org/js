import { Loader } from "@vistta/cli";
import fs from "@vistta/fs";
import { RESOURCES_PATH } from "../../utils/index.js";

export default class FileLoader extends Loader {
  /**
   * @param {string} source
   * @param {{ path: string, type?: string, encoding?: string }} options
   * @returns {Promise<{ code: string, resources: { path: string, hash: string }[] }>}
   */
  async load(source, { path, type, encoding }) {
    const urlHash = fs.fileId(path) + fs.extname(path);
    if (type === "reader")
      return {
        code: `export default ${JSON.stringify(await fs.readFile(path, encoding || "utf8"))}`,
        resources: [{ path, hash: urlHash }],
      };
    return {
      code: `export default "/${RESOURCES_PATH}/${urlHash}";`,
      resources: [{ path, hash: urlHash }],
    };
  }
}
