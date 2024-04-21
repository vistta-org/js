import { transform } from "esbuild";
import { tsconfig } from "../typescript.js";
import { default as transformJSX } from "./jsx.js";

export default async function (source, { path, extension }) {
  try {
    const isXML = extension.endsWith("x");
    const { code, warnings } = await transform(source, {
      format: "esm",
      treeShaking: true,
      loader: isXML ? extension : "ts",
      tsconfigRaw: {
        compilerOptions: tsconfig,
      },
      jsx: "preserve",
      sourcemap: false,
      target: "esnext",
    });
    if (isXML) return transformJSX(code, { path, warnings });
    return { code: code, warnings };
  } catch (e) {
    return { errors: [`${path}(0,0): json error: ${e.message}.`] };
  }
}