import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "../../..");
const cli = join(root, "packages/cli/bin.js");
const component =
  'import { Component, Router } from "@vistta/js"; export default class Page extends Component { render() { return <p>{Router.location.pathname}</p>; } }';

function fixture(files, type = "web") {
  const directory = mkdtempSync(join(import.meta.dirname, ".build-"));
  for (const [name, source] of Object.entries(files)) {
    const filepath = join(directory, "app", name);
    mkdirSync(dirname(filepath), { recursive: true });
    writeFileSync(filepath, source);
  }
  writeFileSync(
    join(directory, "run.js"),
    `import Builder from "@vistta/js/builder";
import { fileURLToPath } from "node:url";
const result = await Builder.build(fileURLToPath(new URL("./app", import.meta.url)), {
  type: ${JSON.stringify(type)}, output: fileURLToPath(new URL("./dist", import.meta.url))
});
console.log("BUILD_ROUTES=" + JSON.stringify(result.routes));`,
  );
  const result = spawnSync(process.execPath, [cli, join(directory, "run.js")], {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
  });
  return {
    directory,
    result,
    read: (path) => readFileSync(join(directory, "dist", path), "utf8"),
    clean: () => rmSync(directory, { recursive: true, force: true }),
  };
}

suite("Static builds", () => {
  test("web expands config.static.params and renders concrete URLs without shipping build metadata", () => {
    const build = fixture({
      "page.jsx": component,
      "users/[id]/page.jsx": `${component}\nexport const config = { title: "Users fixture", static: { params: [{}, { id: "hello world" }, { id: "a/b" }] } };`,
      "docs/[...slug]/page.jsx": `${component}\nexport const config = { static: { params: async () => [{}, { slug: ["one", "two words"] }, { slug: "three/four" }] } };`,
      "sync/[id]/page.jsx": `${component}\nexport const config = { static: { params: () => [{ id: "sync-value" }] } };`,
      "missing/[id]/page.jsx": component,
    });
    try {
      assert.equal(build.result.status, 0, build.result.stdout + build.result.stderr);
      for (const path of [
        "/",
        "/users/",
        "/users/hello%20world/",
        "/users/a%2Fb/",
        "/docs/",
        "/docs/one/two%20words/",
        "/docs/three/four/",
        "/sync/sync-value/",
      ]) {
        assert.ok(build.read(path + "index.html").includes(`<p>${path}</p>`), path);
        assert.ok(build.read(path + "page.js").length > 0);
      }
      assert.equal(build.read("users/page.js"), build.read("users/hello%20world/page.js"));
      assert.ok(build.read("users/index.html").includes("<title>Users fixture</title>"));
      assert.ok(build.read("users/page.js").includes("Users fixture"));
      assert.doesNotMatch(build.read("users/page.js"), /["']?static["']?\s*:/);
      assert.ok(!build.read("users/page.js").includes("hello world"));
      assert.doesNotMatch(build.read("docs/three/four/page.js"), /["']?static["']?\s*:/);
      assert.ok(!build.read("sync/sync-value/page.js").includes("sync-value"));
      assert.match(
        build.result.stderr + build.result.stdout,
        /Skipping dynamic page \/missing\/:id: no config\.static\.params/,
      );
      assert.equal(existsSync(join(build.directory, "dist/missing")), false);
    } finally {
      build.clean();
    }
  });

  test("web emits the root path for an omitted root parameter", () => {
    const build = fixture({ "[id]/page.jsx": `${component}\nexport const config = { static: { params: [{}] } };` });
    try {
      assert.equal(build.result.status, 0, build.result.stdout + build.result.stderr);
      assert.ok(build.read("index.html").includes("<p>/</p>"));
    } finally {
      build.clean();
    }
  });

  test("web rejects duplicate output paths before writing pages", () => {
    for (const files of [
      {
        "users/page.jsx": component,
        "users/[id]/page.jsx": `${component}\nexport const config = { static: { params: [{}] } };`,
      },
      {
        "users/[id]/page.jsx": `${component}\nexport const config = { static: { params: [{ id: "same" }, { id: "same" }] } };`,
      },
    ]) {
      const build = fixture(files);
      try {
        assert.notEqual(build.result.status, 0);
        assert.match(build.result.stderr + build.result.stdout, /Duplicate output path/);
        assert.equal(existsSync(join(build.directory, "dist/users/index.html")), false);
      } finally {
        build.clean();
      }
    }
  });

  test("web rejects invalid parameters and missing non-trailing parameters", () => {
    for (const params of ["{}", "[{}]", '[{ id: ".." }]']) {
      const build = fixture({
        "users/[id]/title/page.jsx": `${component}\nexport const config = { static: { params: ${params} } };`,
      });
      try {
        assert.notEqual(build.result.status, 0);
        assert.match(build.result.stderr + build.result.stdout, /config\.static\.params/);
      } finally {
        build.clean();
      }
    }
  });

  test("app emits one module per pattern and resolves named, catch-all and optional routes", () => {
    const build = fixture(
      {
        "page.jsx": component,
        "users/[id]/page.jsx": `${component}\nexport const config = { static: { params: () => { throw new Error("App builds must not evaluate static params"); } } };`,
        "users/new/page.jsx": component,
        "users/[id]/title/page.jsx": component,
        "docs/[...slug]/page.jsx": component,
      },
      "app",
    );
    try {
      assert.equal(build.result.status, 0, build.result.stdout + build.result.stderr);
      const manifest = JSON.parse(build.result.stdout.match(/BUILD_ROUTES=(.*)/)[1]);
      assert.equal(manifest.length, 5);
      const client = build.read("assets/client.js");
      const routes = { $manifest: {} };
      for (const { name, pathname } of manifest) {
        assert.ok(build.read(`routes/${name}.js`).length > 0);
        assert.doesNotMatch(build.read(`routes/${name}.js`), /["']?static["']?\s*:/);
        assert.ok(client.includes(`../routes/${name}.js`));
        routes.$manifest[pathname] = name;
      }
      const source = readFileSync(fileURLToPath(new URL("../clients/spa.js", import.meta.url)), "utf8");
      const context = vm.createContext({ routes });
      vm.runInContext(source.slice(source.indexOf("function resolve(pathname)")), context);
      for (const [path, pattern] of [
        ["/", "/"],
        ["/users", "/users/:id"],
        ["/users/", "/users/:id"],
        ["/users/123", "/users/:id"],
        ["/users/123/", "/users/:id"],
        ["/users/new", "/users/new"],
        ["/users/new/", "/users/new"],
        ["/users/123/title", "/users/:id/title"],
        ["/docs/", "/docs/*"],
        ["/docs/a/b", "/docs/*"],
        ["/other", null],
        ["/users/123/extra", null],
      ]) {
        assert.equal(context.resolve(path), pattern === null ? null : routes.$manifest[pattern], path);
      }
    } finally {
      build.clean();
    }
  });
});
