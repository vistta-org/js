#!/usr/bin/env node
"use strict";
import "./loaders/env.js";
import { Console, fs, spawn, exec } from "@vistta/utils";
import { flatten, parse as _parse, sleep } from "../utils/index.js";
import { validate as _validate } from "./loaders/typescript.js";
const dirname = fs.dirname(import.meta.url);
const pkg = await loadPackage(fs.resolve(dirname, "../"));
const { main, args, env } = await parse(process.argv.slice(2));
const default_args = ["--no-warnings", "--loader", "@vistta/js/loader"];
// eslint-disable-next-line no-global-assign
console = new Console("", { persistent: env.DEBUG });
if (main !== "validation") console.announce("Starting VisttaJS...");
Object.assign(process.env, env);

const isUpToDate = await validate("modules", null, env);
if (!(await validate("typescript", main, env))) abort();

if (env.VALIDATION !== "only") {
  if (env.TEST_RUN) default_args.push("--test", ...args);
  else if (env.NODE_ENV === "development") default_args.push("--watch", main, ...args);
  else default_args.push(main, ...args);
  const child = await spawn("node", default_args, {
    stdio: 'inherit'
  });
  child.on("exit", (code) => process.exit(code));
} else if (!isUpToDate) abort();

//

function abort(error) {
  if (error) console.error(error);
  process.exit(1);
}

async function parse([main, ...args]) {
  if (!main?.length) return abort(`Missing first argument`);
  let env = flatten((await loadPackage(process.cwd()))?.env || {}, "_", (s) =>
    s.toUpperCase(),
  );
  env.IS_NODE = true;
  env.NODE_ENV = "production";
  env.APP_VERSION = pkg.version;
  env.APP_NAME = pkg.name;
  env.VALIDATION = "modules";
  if (main === "build") env.BUILD = true;
  let skipNext = false;
  args = args.filter((arg, index, arr) => {
    if (skipNext) return (skipNext = false), false;
    if (["-d", "--dev"].includes(arg.toLowerCase())) {
      if (!env.BUILD) env.NODE_ENV = "development";
      return false;
    }
    if (arg.toLowerCase() === "--debug")
      return (env.DEBUG = true, false);
    if (arg.toLowerCase() === "--trace")
      return (env.CONSOLE_TRACE = true, false);
    if (arg.toLowerCase() === "--validation")
      return (env.VALIDATION = "all", false);
    if (arg.toLowerCase() === "--env") {
      skipNext = true;
      if (arr?.[index + 1]) {
        const [key, value] = arr[index + 1].split(/=(.*)/)
        env[key] = value;
      }
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
    case "test":
      env.TEST_RUN = true;
      break;
    default:
      if (!fs.isFile(main)) return abort(`Invalid first argument, it can either be a file or a command`);
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

async function loadPackage(dir) {
  try {
    return _parse(await fs.readFile(fs.resolve(dir, "package.json"), "utf-8"));
  } catch (e) {
    console.error(e);
    return {};
  }
}