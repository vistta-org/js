import { fs } from "@vistta/utils/fs";
import ts from "typescript";

const Compiler = ts.createCompilerHost({});

export const tsconfig = (() => {
  const rootOptions = loadTSConfig(fs.resolve(fs.dirname(import.meta.url), "../../"))?.compilerOptions || {};
  const projectOptions = loadTSConfig(process.cwd())?.compilerOptions || {};
  const options = Object.assign(rootOptions, projectOptions);
  options.paths = Object.assign(projectOptions?.paths || {}, rootOptions?.paths || {});
  options.typeRoots = [...(rootOptions?.typeRoots || []), ...(projectOptions?.typeRoots || [])];
  options.incremental = false;
  return options;
})()

export function validate(path, source) {
  const errors = [];
  const sourceFile = source && ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
  ts.getPreEmitDiagnostics(
    ts.createProgram({
      rootNames: convertPath(path),
      options: tsconfig,
      host: Object.assign({}, Compiler, {
        getSourceFile: (name, languageVersion) => {
          const file = name === path && sourceFile ? sourceFile : Compiler.getSourceFile(name, languageVersion);
          if (/^\/\/\s*@ts-nocheck/.test(file.text)) return ts.createSourceFile(path, "", ts.ScriptTarget.Latest);
          if (/\/\/\s*@ts-/.test(file.text))
            return ts.createSourceFile(
              path,
              file.text
                .split("\n")
                .filter((line, index, lines) => !(/\/\/\s*@ts-/.test(lines?.[index - 1] || "") || /\/\/\s*@ts-/.test(line)))
                .join("\n"),
              ts.ScriptTarget.Latest
            );
          return file;
        },
      }),
    })
  ).forEach((diagnostic) => {
    const { line, character } = diagnostic.file ? ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start) : {};
    errors.push(`${path} (${line || 0},${character || 0}): ${ts.flattenDiagnosticMessageText(diagnostic.messageText)}`);
  });
  return errors ? { errors } : null;
}

export function compilerResolver(path, cwd) {
  const paths = Object.keys(tsconfig?.paths || {});
  for (let i = 0, len = paths?.length || 0; i < len; i++) {
    if (!paths[i].endsWith("*")) continue;
    const regex = paths[i].slice(0, -1);
    const cur = tsconfig?.paths[paths[i]][0];
    if (new RegExp(`^${regex}.*`).test(path) && cur.endsWith("*"))
      return path.replace(new RegExp(`^${regex}`), fs.resolve(cwd, cur.slice(0, -1)) + "\\");
  }
  return path;
}

//

// 
function loadTSConfig(folder) {
  try {
    const json = fs.readFileSync(fs.resolve(folder, "./tsconfig.json"), "utf-8");
    return JSON.parse(json) || {};
  } catch {
    return {};
  }
}

function convertPath(path) {
  if (fs.isFile(path)) return [path];
  let paths = [];
  const files = fs.readdirSync(path);
  for (let i = 0, len = files.length; i < len; i++) {
    if (files[i] === "node_modules") continue;
    const cur = path + "/" + files[i];
    if (fs.isFile(cur)) {
      if (![".tsx", ".ts", ".mts", ".cts"].includes(fs.extname(cur))) continue;
      paths.push(cur);
    } else paths.push(...convertPath(cur));
  }
  return paths;
}
