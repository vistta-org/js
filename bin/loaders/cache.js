import { fs } from "../../server/filesystem/index.js";
import { hash } from "../../server/crypto/index.js";
import { encode, decode } from "../../utils/string.js";
import { stringify, parse } from "../../utils/object.js";
const isProd = process.env.NODE_ENV === "production";

class Cache {
  #dir = "./.vistta";

  constructor() {
    if (!isProd) return (this.cache = {}), this;
    if (!fs.existsSync(this.#dir)) fs.mkdir(this.#dir);
    else {
      const files = fs.readdirSync(this.#dir);
      for (let i = 0, len = files.length; i < len; i++) fs.rmSync(`${this.#dir}/${files[i]}`, { force: true });
    }
  }

  exists(key) {
    if (isProd) return fs.existsSync(`${this.#dir}/${hash(key, "md5", "hex")}`);
    return this.cache[key] != null;
  }

  set(key, value) {
    if (isProd) fs.writeFileSync(`${this.#dir}/${hash(key, "md5", "hex")}`, encode(stringify(value), "base64"), "utf8");
    else this.cache[key] = value;
  }

  get(key) {
    if (!this.exists(key)) return null;
    if (isProd) return parse(decode(fs.readFileSync(`${this.#dir}/${hash(key, "md5", "hex")}`, "utf8")));
    return this.cache[key];
  }

  clear(key) {
    if (!this.exists(key)) return null;
    if (isProd) fs.rmSync(`${this.#dir}/${hash(key, "md5", "hex")}`, { force: true });
    else delete this.cache[key];
  }
}

const cache = new Cache();

export default cache;
