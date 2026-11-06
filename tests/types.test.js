import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";

suite("Published JSDoc types", () => {
  test("supports public imports in a strict NodeNext consumer with allowJs", () => {
    const directory = mkdtempSync(join(import.meta.dirname, ".types-"));
    try {
      const source = join(directory, "consumer.mts");
      writeFileSync(
        source,
        `import { Worker, Context } from "@vistta/js";
import Server from "@vistta/js/server";
import Builder from "@vistta/js/builder";
import { BuildCLI, DefaultCLI, RunCLI, ServeCLI, TestCLI } from "@vistta/js/cli";
import { APILoader, FileLoader, JSXLoader, StyleLoader, TemplateLoader } from "@vistta/js/cli/loaders";
import "@vistta/js/testing/renderer";
void Worker;
new Context("shared", { count: 0 }, { cache: "local", sync: true });
const server = new Server({ http: 3000, cors: { origins: ["https://trusted.example"] } });
const subdomains: string[] = server.routes.get("subdomains");
void subdomains;
void server.routes.get("get");
void server.routes.get("get", "/");
void server.routes.get("get", "api", "/status");
server.routes.set("get", "/", (request, response) => response.send(request.params));
server.routes.set("get", "api", "/status", (request, response) => response.send(request.params));
void server.routes.use("/", {});
void server.routes.use("api", "/", {});
void Builder.build("./app", { type: "web" });
for (const Command of [BuildCLI, DefaultCLI, RunCLI, ServeCLI, TestCLI]) new Command().register("loader.js");
for (const Loader of [APILoader, FileLoader, JSXLoader, StyleLoader]) void new Loader().load("", { path: "file.js" });
void new TemplateLoader().load("");
`,
      );
      const program = ts.createProgram([source], {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,
        module: ts.ModuleKind.NodeNext,
        target: ts.ScriptTarget.ES2022,
      });
      const packageRoot = resolve(import.meta.dirname, "..") + "/";
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .filter(
          (diagnostic) =>
            !diagnostic.file || diagnostic.file.fileName.replace(/\\/g, "/").startsWith(packageRoot.replace(/\\/g, "/")),
        );
      assert.equal(
        diagnostics.length,
        0,
        ts.formatDiagnostics(diagnostics, {
          getCurrentDirectory: () => directory,
          getCanonicalFileName: (name) => name,
          getNewLine: () => "\n",
        }),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
