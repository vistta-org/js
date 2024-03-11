import { transform } from "esbuild";
import { tsconfig } from "../typescript.js";
let id = 0;
export default async function (source, { extension }) {
  try {
    const { code, warnings } = await transform(source, {
      format: "esm",
      loader: extension.endsWith("x") ? extension : "ts",
      tsconfigRaw: {
        compilerOptions: tsconfig,
      },
      sourcemap: false,
      target: "esnext",
    })
    return { code: code.replace(/createElement\(/g, () => `createElement.call({ id: ${id++}},`), warnings };
  } catch (e) {
    return [e];
  }
}
