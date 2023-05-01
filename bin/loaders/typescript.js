import { fs } from "../../server/filesystem/index.js";
import ts from "typescript";

const Compiler = ts.createCompilerHost({});

export const tsconfig = Object.assign((() => {
  try {
    const json = fs.readFileSync(fs.resolve(fs.dirname(import.meta.url), "../../tsconfig.json"), "utf-8");
    return JSON.parse(json)?.compilerOptions || {};
  }
  catch {
    return {};
  }
})(), {
  module: "esnext",
  lib: ["lib.esnext.full.d.ts", fs.resolve(fs.dirname(import.meta.url), "../../index.d.ts")],
});

export function validate(path, source) {
  const errors = [];
  const sourceFile = source && ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
  const program = ts.createProgram({
    rootNames: [path],
    options: tsconfig,
    host: Object.assign({}, Compiler, {
      getSourceFile: (name, languageVersion) =>
        name === path && sourceFile ? sourceFile : Compiler.getSourceFile(name, languageVersion),
    }),
  });
  ts.getPreEmitDiagnostics(program)
    .concat(program.emit()?.diagnostics)
    .forEach((diagnostic) => {
      const { line, character } = diagnostic.file ? ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start) : {};
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText);
      errors.push(`${path} (${line || 0},${character || 0}): ${message}`);
    });
  return errors ? { errors } : null;
}

export function compilerResolver(path, cwd) {
  const paths =  Object.keys(tsconfig?.paths || {});
  for(let i = 0, len = paths?.length || 0; i < len; i++) {
    if(!paths[i].endsWith("*")) continue;
    const regex = paths[i].slice(0, -1);
    if(new RegExp(`^${regex}.*`).test(path)) return path.replace(new RegExp(`^${regex}`), cwd);
  }
  return path;
}