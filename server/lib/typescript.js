import { fs } from "./filesystem.js";
import ts from "typescript";

export const tsconfig = {
  importsNotUsedAsValues: "remove",
  jsxFactory: "createElement",
  jsxFragmentFactory: "Fragment",
  strict: true,
  noImplicitAny: false,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
  resolveJsonModule: true,
};

const typescript = {
  compiler: null,
  config: {
    target: "esnext",
    module: "esnext",
    lib: ["lib.esnext.full.d.ts", fs.resolve(fs.dirname(import.meta.url), "../../index.d.ts")],
    noEmit: true,
    declaration: false,
    jsx: "react",
    ...tsconfig,
  },
};

export function validate(path, source) {
  if (!typescript.compiler) typescript.compiler = ts.createCompilerHost({});
  const errors = [];
  const sourceFile = source && ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
  const program = ts.createProgram({
    rootNames: [path],
    options: typescript.config,
    host: Object.assign({}, typescript.compiler, {
      getSourceFile: (name, languageVersion) =>
        name === path && sourceFile ? sourceFile : typescript.compiler.getSourceFile(name, languageVersion),
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
