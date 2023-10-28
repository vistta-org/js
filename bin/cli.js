#!/usr/bin/env node
"use strict";
import "../server/console/index.js";
import { fs } from "../server/filesystem/index.js";
import { spawn, exec } from "../server/process/index.js";
import { flatten, parse as _parse, sleep } from "../utils/index.js";
import { validate as _validate } from "./loaders/typescript.js";
const pkg = await loadPackage("./");
const dirname = fs.dirname(import.meta.url);

console.announce("Starting VisttaJS...");

const { main, args, env } = await parse(process.argv.slice(2));
Object.assign(process.env, env);

const isUpToDate = await validate("modules", null, env);
if (!(await validate("typescript", main, env))) abort();

if (env.VALIDATION !== "only") {
  const child = spawn("node", ["--no-warnings", "--loader", "./bin/loaders/index.js", main, ...args], {
    stdio: 'inherit'
  });
  if (env.CUSTOM_SCRIPT && env.NODE_ENV === "development")
    fs.watchFile(main, async () => {
      console.clear();
      console.announce("Restarting VisttaJS...");
      await child.stop();
      console.clear();
      if (await validate("typescript", main, env)) abort("");
      await child.start();
    });
} else if (!isUpToDate) abort();

//

function abort(error) {
  if (error) console.error(error);
  process.exit(1);
}

async function parse([main, ...args]) {
  if (!main?.length) return abort(`Missing first argument`);
  let env = flatten((await loadPackage(process.cwd()))?.default?.env || {}, "_", (s) =>
    s.toUpperCase(),
  );
  env.NODE_ENV = "production";
  env.APP_VERSION = pkg.version;
  env.APP_NAME = pkg.name;
  env.VALIDATION = "modules";
  env.DYNAMIC_LOG_ENABLED = !!process.stdout.isTTY;
  if (main === "build") env.BUILD = true;
  let skipNext = false;
  args = args.filter((arg, index, arr) => {
    if (skipNext) return (skipNext = false), false;
    if (["-d", "--dev"].includes(arg.toLowerCase())) {
      if (!env.BUILD) env.NODE_ENV = "development";
      return false;
    }
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
    case "build":
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
  if (NODE_ENV !== "development") return true;
  if (target === "modules") {
    if (!["modules", "all", "only"].includes(VALIDATION)) return true;
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
        if (current === wanted) console.print(`${Console.cyan}Module "${module}" has a new version (${latest})`);
        else {
          console.print(`${Console.yellow}Module "${module}" is outdated (${latest})`);
          valid = false;
        }
      }
      if (modules.length) await sleep(2500);
      return valid || VALIDATION !== "only";
    } catch {
      /* Do Nothing */
    }
    return;
  }
  if (target === "typescript") {
    if (!["typescript", "type", "all", "only"].includes(VALIDATION)) return true;
    const { errors } = _validate(VALIDATION === "only" ? "." : main);
    if (!errors?.length) return true;
    errors.forEach((error) => console.print(Console.red + error));
    return false;
  }
}

function transformFlag(flag) {
  if (flag === "--validate") flag = "--validation";
  return flag.slice(2).toUpperCase().replaceAll("-", "_");
}

async function loadPackage(dir) {
  try {
    return _parse(await fs.readFile(fs.resolve(dir, "package.json"), "utf-8"));
  } catch (e) {
    console.error(e);
    return {};
  }
}