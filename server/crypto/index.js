import { createHash, randomBytes } from "node:crypto";

export const hash = (string, algorithm = "md5", encoding = "base64") =>
  createHash(algorithm).update(string).digest(encoding);

export const randomID = (bits = 16) => randomBytes(bits).toString("hex");
