#!/usr/bin/env node --no-warnings --loader=@vistta/visttajs/loader
"use strict";
import { fork, fs } from "../server/index.js";
import { validate } from "./loaders/typescript.js";
import Cache from "./loaders/cache.js";
import pkg from "../package.json";
new Cache(true);
console.announce("Starting VisttaJS...");
const dirname = fs.dirname(import.meta.url);
const abort = (error) => (console.error(error), process.exit(0));
let custom = false;
let type = "production";
let validation = "none";
const [main, ...args] = ((argv) => {
  if (argv.length == 0) return abort(`Missing first argument`);
  argv = argv.filter((arg) => {
    if (["--d", "--dev"].includes(arg)) return (type = "development"), false;
    if (["--t", "--tsc"].includes(arg)) return (validation = "all"), false;
    return true;
  });
  if (fs.isFile(argv[0])) return (custom = true), argv;
  if (["start"].includes(argv[0])) {
    argv[0] = fs.resolve(dirname, `../scripts/${argv[0]}.js`);
    return argv;
  }
  return abort(`Invalid first argument, it can either be a script or a command`);
})(process.argv.slice(2));
const env = Object.assign((await import(fs.resolve(process.cwd(), "package.json")))?.default?.env || {}, {
  TYPESCRIPT_VALIDATION: validation,
  VISION_VERSION: pkg.version,
  NODE_ENV: type,
});

const { errors } = custom && type === "development" && validation !== "none" ? validate(main) : {};
if (errors?.length) {
  errors.forEach((error) => console.error(error));
  abort("Typescript Error");
}
const childProcess = await fork(main, args, { env });
if (custom && type === "development")
  fs.watchFile(main, async () => {
    console.clear();
    console.announce("Restarting VisttaJS...");
    await childProcess.stop();
    console.clear();
    const { errors } = validation !== "none" ? validate(main) : {};
    if (errors?.length) {
      errors.forEach((error) => console.error(error));
      return;
    }
    await childProcess.start();
  });
