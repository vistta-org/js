import { fs } from "../server/lib/filesystem.js";
import { hash } from "../server/lib/crypto.js";
import { encode, decode } from "../utils/string.js";
import { tmpdir } from "node:os";

function fsHash(string) {
  return hash(string, "SHA256").replace(/[/\\?%*:|"+<>=]/g, (char) => char.charCodeAt(0));
}

function getDirname(pid) {
  return `${tmpdir()}\\${fsHash(pid.toString())}`;
}

export default class Cache {
  #dir;
  constructor(isCLI) {
    if (isCLI) {
      this.#dir = getDirname(process.pid);
      fs.mkdirSync(this.#dir);
      process.stdin.resume();
      const exitHandler = () => {
        try {
          fs.rmSync(this.#dir, { recursive: true, force: true });
        } catch {
          /* empty */
        }
        process.exit();
      };
      process.on("exit", exitHandler);
      process.on("SIGINT", exitHandler);
      process.on("SIGUSR1", exitHandler);
      process.on("SIGUSR2", exitHandler);
      process.on("uncaughtException", exitHandler);
    } else {
      this.#dir = getDirname(process.ppid);
      if (!fs.isDirectory(this.#dir)) this.#dir = null;
    }
  }

  exists(key) {
    if (!this.#dir) return false;
    return fs.isFile(`${this.#dir}\\${fsHash(key)}.tmp`);
  }

  set(key, value) {
    if (!this.#dir) return null;
    fs.writeFileSync(`${this.#dir}\\${fsHash(key)}.tmp`, encode(JSON.stringify(value)), "utf-8");
  }

  get(key) {
    if (!this.#dir || !this.exists(key)) return null;
    return JSON.parse(decode(fs.readFileSync(`${this.#dir}\\${fsHash(key)}.tmp`, "utf-8")));
  }

  clear(key) {
    if (!this.#dir || !this.exists(key)) return null;
    fs.unlinkSync(`${this.#dir}\\${fsHash(key)}.tmp`);
  }
}
