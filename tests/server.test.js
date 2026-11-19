import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { createServer } from "node:net";
import Server from "../server/index.js";

async function freePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => resolve(undefined));
  });
  const address = listener.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

function websocketHandshake(base, origin) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(base + "/socket.io/?EIO=4&transport=websocket", {
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
        ...(origin == null ? {} : { Origin: origin }),
      },
    });
    request.on("upgrade", (response, socket) => {
      socket.destroy();
      resolve(response.statusCode);
    });
    request.on("response", (response) => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on("error", (error) => ("code" in error && error.code === "ECONNRESET" ? resolve(0) : reject(error)));
    request.setTimeout(5000, () => request.destroy(new Error("WebSocket handshake timed out")));
    request.end();
  });
}

suite("Server security", () => {
  test("allows standard native origins without configuration for HTTP and WebSocket handshakes", async () => {
    const origins = ["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"];
    for (const origin of [
      "null",
      "*",
      "tauri://other",
      "tauri://localhost/",
      "tauri://localhost.evil",
      "https://trusted.example/path",
    ]) {
      assert.throws(() => new Server({ http: 3000, start: false, cors: { origins: [origin] } }), TypeError);
    }
    const port = await freePort();
    const server = new Server({ http: port, host: "127.0.0.1", start: false });
    server.routes.set("all", "/", (request, response) => response.send("ok"));
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    try {
      for (const origin of origins) {
        for (const method of ["GET", "POST", "OPTIONS"]) {
          const response = await fetch(base, { method, headers: { Origin: origin } });
          assert.equal(response.status, method === "OPTIONS" ? 204 : 200, `${method} ${origin}`);
          assert.equal(response.headers.get("access-control-allow-origin"), origin);
          assert.equal(response.headers.get("access-control-allow-credentials"), "true");
          await response.text();
        }
        const preflight = await fetch(base + "/socket.io/?EIO=4&transport=polling", {
          method: "OPTIONS",
          headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get("access-control-allow-origin"), origin);
        await preflight.text();
        assert.equal(await websocketHandshake(base, origin), 101, origin);
      }
      assert.equal(await websocketHandshake(base), 101, "native requests without Origin");
      for (const origin of [
        "null",
        "https://evil.example",
        "tauri://other",
        "http://tauri.localhost.evil",
        "https://tauri.localhost.evil",
        "http://localhost:1420",
      ]) {
        const denied = await fetch(base, { headers: { Origin: origin } });
        assert.equal(denied.status, 403);
        assert.equal(denied.headers.get("access-control-allow-origin"), null);
        await denied.text();
        const status = await websocketHandshake(base, origin);
        assert.ok([0, 400, 403].includes(status), `${origin}: expected refused handshake, got ${status}`);
      }
    } finally {
      await server.stop(undefined, { force: true });
    }
  });

  test("can disable default native access without disabling explicit web origins", async () => {
    const port = await freePort();
    const server = new Server({
      http: port,
      host: "127.0.0.1",
      start: false,
      cors: { native: false, origins: ["http://localhost:1420"] },
    });
    server.routes.set("get", "/", (request, response) => response.send("ok"));
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    try {
      for (const origin of ["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"]) {
        const denied = await fetch(base, { headers: { Origin: origin } });
        assert.equal(denied.status, 403);
        assert.equal(denied.headers.get("access-control-allow-origin"), null);
        await denied.text();
        const status = await websocketHandshake(base, origin);
        assert.ok([0, 400, 403].includes(status), origin);
      }
      const allowed = await fetch(base, { headers: { Origin: "http://localhost:1420" } });
      assert.equal(allowed.status, 200);
      assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:1420");
      await allowed.text();
      assert.equal(await websocketHandshake(base, "http://localhost:1420"), 101);
    } finally {
      await server.stop(undefined, { force: true });
    }
  });

  test("enforces origins, encodes cookies, and hides internal errors", async () => {
    const port = await freePort();
    const server = new Server({ http: port, host: "127.0.0.1", start: false });
    server.routes.set("get", "/", (request, response) => response.send("ok"));
    server.routes.set("get", "/cookie", (request, response) => {
      response.set("cookie", "session", "value; Secure=false = &");
      response.send(request.cookies);
    });
    server.routes.set("get", "/error", () => {
      throw new Error("private/server/path");
    });
    await server.start();
    const base = `http://127.0.0.1:${port}`;
    try {
      const normal = await fetch(base);
      assert.equal(normal.status, 200);
      assert.equal(normal.headers.get("access-control-allow-origin"), null);
      await normal.text();
      const same = await fetch(base, { headers: { Origin: base } });
      assert.equal(same.headers.get("access-control-allow-origin"), base);
      await same.text();
      const httpsOrigin = `https://127.0.0.1:${port}`;
      const proxied = await fetch(base, { headers: { Origin: httpsOrigin, "X-Forwarded-Proto": "https" } });
      assert.equal(proxied.status, 200, "same host behind a TLS-terminating proxy");
      await proxied.text();
      const unproxied = await fetch(base, { headers: { Origin: httpsOrigin } });
      assert.equal(unproxied.status, 403);
      await unproxied.text();
      for (const method of ["GET", "POST", "OPTIONS"]) {
        const denied = await fetch(base, { method, headers: { Origin: "https://evil.example" } });
        assert.equal(denied.status, 403);
        assert.equal(denied.headers.get("access-control-allow-origin"), null);
        await denied.text();
      }
      const native = await fetch(base, { headers: { Origin: "tauri://localhost" } });
      assert.equal(native.status, 200, "standard native origins work without configuration");
      await native.text();
      const handshake = await fetch(base + "/socket.io/?EIO=4&transport=polling", {
        headers: { Origin: "https://evil.example" },
      });
      assert.equal(handshake.status, 403);
      await handshake.text();
      const cookie = await fetch(base + "/cookie", { headers: { Cookie: "session=value%3B%20Secure%3Dfalse%20%3D%20%26" } });
      assert.match(cookie.headers.get("set-cookie"), /^session=value%3B%20Secure%3Dfalse%20%3D%20%26;/);
      assert.equal((await cookie.json()).session, "value; Secure=false = &");
      const error = await fetch(base + "/error");
      assert.equal(error.status, 500);
      assert.equal(await error.text(), "Internal Server Error");
    } finally {
      await server.stop();
    }
    const allowedPort = await freePort();
    const allowed = new Server({
      http: allowedPort,
      host: "127.0.0.1",
      start: false,
      cors: { origins: ["https://trusted.example"] },
    });
    allowed.routes.set("get", "/", (request, response) => response.send("ok"));
    await allowed.start();
    try {
      const response = await fetch(`http://127.0.0.1:${allowedPort}`, {
        method: "OPTIONS",
        headers: { Origin: "https://trusted.example" },
      });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("access-control-allow-origin"), "https://trusted.example");
      assert.equal(response.headers.get("access-control-allow-credentials"), "true");
      await response.text();
    } finally {
      await allowed.stop();
    }
  });
});
