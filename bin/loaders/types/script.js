import { transform } from "esbuild";
import { tsconfig } from "../typescript.js";

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
    });
    return { code: code, warnings };
  } catch (e) {
    console.log(e);
    return [e];
  }
}
