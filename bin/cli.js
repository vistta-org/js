#!/usr/bin/env node --no-warnings --loader=@vistta/vistta.js/loader
"use strict";
import { run, fs, exec } from "../server/index.js";
import { flatten, parse as _parse, sleep } from "../utils/index.js";
import { validate as _validate } from "./loaders/typescript.js";
import pkg from "../package.json";
const dirname = fs.dirname(import.meta.url);

console.announce("Starting VisttaJS...");

const { main, args, env } = await parse(process.argv.slice(2));
Object.assign(process.env, env);

const needsUpdate = await validate("modules", null, env);
if (await validate("typescript", main, env)) abort();

if (env.VALIDATION !== "only") {
  const worker = await run(main, args);
  if (env.CUSTOM_SCRIPT && env.NODE_ENV === "development")
    fs.watchFile(main, async () => {
      console.clear();
      console.announce("Restarting VisttaJS...");
      await worker.stop();
      console.clear();
      if (await validate("typescript", main, env)) abort("");
      await worker.start();
    });
} else if (needsUpdate) abort();

//

function abort(error) {
  if (error) console.error(error);
  process.exit(1);
}

async function parse([main, ...args]) {
  if (!main?.length) return abort(`Missing first argument`);
  let env = flatten((await import(fs.resolve(process.cwd(), "package.json")))?.default?.env || {}, "_", (s) =>
    s.toUpperCase()
  );
  env.NODE_ENV = "production";
  env.APP_VERSION = pkg.version;
  env.APP_NAME = pkg.name;
  env.VALIDATION = "modules";
  let skipNext = false;
  args = args.filter((arg, index, arr) => {
    if (skipNext) return (skipNext = false), false;
    if (["-d", "--dev"].includes(arg.toLowerCase())) return (env.NODE_ENV = "development"), false;
    if (arg.startsWith("--")) {
      const value = arr?.[index + 1];
      const key = transformFlag(arg);
      if (!value.startsWith("-")) {
        skipNext = true;
        env[key] = value;
      } else env[key] = true;
      return false;
    }
    return true;
  });
  switch (main) {
    case "start":
      main = fs.resolve(dirname, `../scripts/${main}.js`);
      break;
    case "validation":
      env.NODE_ENV = "development";
      env.VALIDATION = "only";
      break;
    default:
      if (!fs.isFile(main)) return abort(`Invalid first argument, it can either be a main or a command`);
      env.CUSTOM_SCRIPT = true;
      break;
  }
  return { main, args, env };
}

async function validate(target, main, { NODE_ENV, VALIDATION }) {
  if (NODE_ENV !== "development") return;
  if (target === "modules") {
    if (!["modules", "all", "only"].includes(VALIDATION)) return;
    try {
      const outdated = await (async () => {
        try {
          return _parse((await exec("npm outdated --json")).stdout || "{}");
        } catch {
          return {};
        }
      })();
      const modules = Object.keys(outdated);
      let valid = true;
      for (let i = 0, len = modules.length; i < len; i++) {
        const module = modules[i];
        const { current, wanted, latest } = outdated[module];
        if (current === wanted) console.print(`${console.code.cyan}Module "${module}" has a new version (${latest})`);
        else {
          console.print(`${console.code.yellow}Module "${module}" is outdated (${latest})`);
          valid = false;
        }
      }
      if (modules.length) await sleep(2500);
      return valid;
    } catch {
      /* Do Nothing */
    }
    return;
  }
  if (target === "typescript") {
    if (!["typescript", "type", "all", "only"].includes(VALIDATION)) return false;
    const { errors } = _validate(VALIDATION === "only" ? "." : main);
    if (!errors?.length) return false;
    errors.forEach((error) => console.print(console.code.red + error));
    return true;
  }
}

function transformFlag(flag) {
  if (flag === "--validate") flag = "--validation";
  return flag.slice(2).toUpperCase().replaceAll("-", "_");
}
