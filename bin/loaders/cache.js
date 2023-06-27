import { fs } from "../../server/filesystem/index.js";
import { encode, decode } from "../../utils/string.js";
import { stringify, parse } from "../../utils/object.js";

class Cache {
  #dir = "./.vistta";

  constructor() {
    if (!fs.existsSync(this.#dir)) fs.mkdir(this.#dir);
  }

  exists(key) {
    return fs.existsSync(`${this.#dir}/${encode(key, "base64")}`);
  }

  set(key, value) {
    fs.writeFileSync(`${this.#dir}/${encode(key, "base64")}`, encode(stringify(value), "base64"), "utf8");
  }

  get(key) {
    if (!this.exists(key)) return null;
    return parse(decode(fs.readFileSync(`${this.#dir}/${encode(key, "base64")}`, "utf8")));
  }

  clear(key) {
    if (!this.exists(key)) return null;
    fs.rmSync(`${this.#dir}/${encode(key, "base64")}`, { force: true });
  }
}

const cache = new Cache();

export default cache;
