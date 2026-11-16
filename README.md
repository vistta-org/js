# **VISTTA JS**

Vistta.js is a convention-driven JavaScript framework for building web (SSR + hydration), mobile (Android), and desktop (Linux/Windows) apps with an instance-based JSX UI model, file-based routing, and built-in server features.

> **Production readiness:** This package has not yet been tested in production. Validate it for your use case before deploying.

## **Features**

- **Component-first UI (instance-based)**: components are `Component` instances. Use class components that extend `Component` (recommended), or function components that return an object with `render()` (adapted into a `Component` internally).
- **Props-as-state model**: there is no strict props/state split — any component instance property is reactive state, and any prop you pass in JSX is assigned onto the component instance.
- **Convention-driven app structure**: routing, layouts, errors, middleware, and config are discovered from files (`page`, `layout`, `error`, `middleware`, `config`).
- **File-based routing**: `page`, `layout`, `error`, `middleware`, `config` conventions.
- **SSR + hydration**: server renders HTML, client router hydrates and navigates.
- **API routes/controllers**: structured endpoints with `GET/POST/PUT/...` helpers.
- **Typed API imports (loader-powered)**: import a controller file in the frontend `with { type: "api" }` to get a client request wrapper generated automatically.
- **WebSockets**: server-side events via `Server.on(...)` / controller `this.socket`, client-side via the `Socket` class.
- **Client router**: SPA-like navigation, link interception, refresh, events, with native View Transitions API for smooth page crossfades.
- **Shared state (`Context`)**: shared state container with optional persistence (`none`, `session`, `local`, `storage`) and reactive proxying. Includes `HistoryContext` and `ThemeContext` specialized contexts.
- **Async UI**: `Suspense` for Promise-backed reactive values.
- **Error boundaries & forms**: `Safe` error boundary, `Form` value collection + validation.
- **Virtual lists**: `VirtualContainer` with virtual scroll (renders only visible rows) and lazy render (IntersectionObserver) modes.
- **CSS-in-JS styling**: built-in style engine via the `style` prop (string/object/array) with enter/exit transitions (`:initial`/`:exit`), plus optional `@vistta/ui` presets, plus a CSS loader that converts `.css` into style objects.
- **Mobile & Desktop apps**: build native apps for Android, Linux, and Windows from the same codebase with client-side routing via a generated route manifest. Requires `@vistta/js-native`.
- **Platform detection**: `window.platform` global (one of `"server"`, `"browser"`, `"mobile"`, `"desktop"`) for cross-platform code.
- **Native helpers**: `Clipboard`, `Haptics`, `Notification`, `Scheduler`, and `File` utilities that adapt per platform (native via `@vistta/js-native/plugins`, Web APIs on browser, no-op on server).
- **CLI + loaders**: works with `@vistta/cli` (bundler/loaders like `api`) and enables extra commands (`serve`, `build`, `run`, `test`).

This package is designed to be used with `@vistta/cli` (peer dependency), which provides the loader/bundler features used by Vistta (e.g. `import ... with { type: "bundler" }`).

## **Requirements**

- Node.js `>= 22`
- `@vistta/cli` installed in your project (peer dependency)
- For native apps (mobile/desktop): `@vistta/js-native` (provides native plugin bridges and build/run runtime)

## **Getting Started (Web App)**

### **Install**

```sh
npm install @vistta/js
```

### **Create a pages folder**

Create a folder (example: `./app`) and add a root page:

`app/page.jsx`

```jsx
import { Component } from "@vistta/js";

export default class Home extends Component {
  render() {
    return (
      <main>
        <h1>Hello from Vistta.js</h1>
        <a href="/about">Go to About</a>
      </main>
    );
  }
}

export const config = {
  title: "Home",
  description: "My first Vistta.js page",
};
```

Add a second page:

`app/about/page.jsx`

```jsx
import { Component } from "@vistta/js";

export default class About extends Component {
  render() {
    return (
      <main>
        <h1>About</h1>
        <a href="/">Back</a>
      </main>
    );
  }
}

export const config = {
  title: "About",
};
```

### **Run the dev server**

Vistta CLI only has a few built-in commands. `@vistta/js` provides additional commands (like `serve`) that you enable via your project's `tsconfig.json` (or `jsconfig.json`).

Add this to your project config:

```json
{
  "extends": "@vistta/js/config"
}
```

```sh
npx vistta serve ./app
```

Then open `http://localhost:3000`.

## **File-Based Routing**

Vistta maps folder structure to routes.

Given a base folder passed to `server.routes.use("/", folder)`, Vistta detects the following route files:

- `page.(js|jsx|ts|tsx)` → page route (SSR + client navigation)
- `layout.(js|jsx|ts|tsx)` → layout wrapper for pages in/under that path
- `config.(js|ts)` → config object merged into page config for that path
- `api.(js|ts)` or `controller.(js|ts)` → API/controller route under `/api/...`
- `middleware.(js|ts)` → middleware for that path
- `error.(js|jsx|ts|tsx)` → error page handler

### **Dynamic routes**

Use bracket folders:

- `app/users/[id]/page.jsx` → `/users/:id`
- `app/docs/[...slug]/page.jsx` → `/docs/*`

The final named parameter is optional: `/chats/:id` matches both `/chats` and `/chats/123`. Parameters before fixed segments remain required, so `/chats/:id/title` requires an ID.

For static web builds, set `static.params` in a dynamic page's exported `config`. It may be an array of parameter objects, or a synchronous or asynchronous function returning one:

```jsx
// app/projects/[slug]/page.jsx
export const config = {
  static: {
    params: [{}, { slug: "cli" }, { slug: "js" }],
  },
};
```

This generates `/projects/`, `/projects/cli/`, and `/projects/js/`. For computed or fetched entries, `params` can instead be `() => catalog.map(({ slug }) => ({ slug }))` or an async function. Omitting the final parameter with `{}` generates the base path; parameters before fixed segments are required. Catch-all parameters use their folder name: for `docs/[...slug]/page.jsx`, `{ slug: "guide/setup" }` and `{ slug: ["guide", "setup"] }` both generate `/docs/guide/setup/`. Each URL segment is URI-encoded. Read the concrete URL through `Router.location` during prerendering, as with server rendering. The `config.static` section is build-only metadata and is excluded from runtime/client config.

Dynamic pages without `config.static.params` are skipped with a warning in static web builds. App builds retain dynamic route patterns without requiring or evaluating `config.static.params`.

### **Static assets**

Files inside an `assets/` folder are served as static resources.

Example:

- `app/assets/logo.svg` → `/assets/logo.svg` (relative to the mounted basepath)

You can also register resources manually via the `server.resources` accessor. Resources are always served under `/assets/`, so you only provide the filename:

```js
// Inline content (string or Buffer)
server.resources.set("logo.svg", "<svg>...</svg>");

// Absolute filepath (served via streaming)
server.resources.set("logo.svg", "/abs/path/to/logo.svg");

// Read back
server.resources.get("logo.svg"); // → the registered content/filepath
server.resources.get(); // → ["/assets/logo.svg", ...] all registered paths
```

The filename must have a file extension (e.g. `.svg`) to be recognized as a resource by the request handler.

### **Route registry (`server.routes`)**

All route registration goes through the `server.routes` accessor, which exposes three methods. All three share the same flexible argument convention as `routes.use`: you may pass `(subdomain, pathname, ...)` or just `(pathname, ...)` — when the subdomain is omitted it defaults to `""`. The subdomain and pathname are validated the same way across all three.

- **`routes.get(type, [subdomain], [pathname])`** — reads registered routes. `type: "subdomains"` lists all subdomain names; otherwise `type` is a route type (`get`/`post`/`middleware`/...) and the matching routes for that subdomain (and optionally a specific pathname) are returned.
- **`routes.set(type, [subdomain], pathname, handler)`** — registers HTTP method handlers, middleware, websockets, pages/configs/layouts, and `redirect`/`proxy` routes. Synchronous; returns a `Route` (or a `Route` collection for `proxy`).
- **`routes.use([subdomain], pathname, target)`** — mounts a directory, file, middleware function, or config object. Async; returns a `Promise<Route>` (a collection of the routes discovered/mounted).

#### `routes.set` types

| `type`                                                                     | `handler` argument                                  | Notes                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `get`, `post`, `put`, `delete`, `patch`, `head`, `options`, `copy`, `move` | `(req, res) => ...`                                 | HTTP method handler                                    |
| `all`                                                                      | `(req, res) => ...`                                 | Matches every standard HTTP method                     |
| `middleware`                                                               | `(req, res, next) => ...`                           | Runs on every request below `pathname`                 |
| `websocket`                                                                | `(req, socket, head) => ...`                        | WebSocket upgrade handler                              |
| `api`                                                                      | `Controller` subclass or `(req, res) => ...`        | Resolved to `controller` or `all`                      |
| `controller`                                                               | `Controller` subclass                               | Registers each `RESTMethod` handler                    |
| `page`, `error`, `config`, `layout`                                        | page/config/layout object                           | Used by `routes.use` internally                        |
| `redirect`                                                                 | target url string or `{ target, preservePathname }` | Issues a 301 redirect                                  |
| `proxy`                                                                    | target url string or `ProxyOptions`                 | Proxies HTTP + WebSocket; returns a `Route` collection |

`routes.set("subdomains", ...)` is rejected — subdomains are created implicitly by registering routes under them.

#### `routes.use` target shapes

| `target`       | Behavior                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------ |
| `Function`     | Registered as `middleware`                                                                 |
| `Object`       | Registered as a `config` route                                                             |
| directory path | Scanned for `api`/`controller`/`middleware`/`page`/`error`/`config`/`layout` files         |
| file path      | Imported; a `Controller` subclass becomes a controller route, a `Component` becomes a page |

#### Examples

```js
// HTTP method handler — subdomain defaults to "" when omitted
server.routes.set("post", "/users", (req, res) => { ... });
server.routes.set("post", "api", "/users", (req, res) => { ... });

// Redirect — handler is the target (string or options object)
server.routes.set("redirect", "/old", "/new");
server.routes.set("redirect", "", "/docs", { target: "https://docs.example.com", preservePathname: true });

// Proxy — handler is the target (string or options object)
server.routes.set("proxy", "api", "/external", "https://api.example.com");
server.routes.set("proxy", "/upstream", { target: "http://localhost:9000", ws: false });

// use — mount a directory/file/function/config (async)
await server.routes.use("/app", "./app");
await server.routes.use("admin", "/auth", authMiddleware);
await server.routes.use("/cfg", { title: "My app" });

// Read registered routes
server.routes.get("subdomains"); // → ["", "api", ...]
server.routes.get("get", "api", "/users"); // → matched Route or null
server.routes.get("get", "api"); // → Route[] for that subdomain
server.routes.get("get", "/users"); // → matched Route on the default subdomain
server.routes.get("get"); // → Route[] on the default subdomain
```

## **Layouts**

Add a `layout.jsx` to wrap pages below that path.

`app/layout.jsx`

```jsx
import { Component } from "@vistta/js";

export default class Layout extends Component {
  render() {
    return (
      <>
        <header>My App</header>
        {this.children}
      </>
    );
  }
}
```

## **Page Config / SEO / PWA**

Pages can export `config` which is merged with inherited configs and defaults.

```js
export const config = {
  title: "My Page",
  description: "...",
  theme: "#ffffff",
  icon: "/assets/icon.png",

  // Enable PWA features when present
  pwa: true,
  short_name: "MyApp",

  // Viewport meta content.
  viewport: "width=device-width, initial-scale=1",

  // Additional head metadata (all updated client-side on navigation)
  keywords: "vistta, app",
  robots: "index, follow",
  author: "Author Name",
  lang: "en",
  colorScheme: "light dark",
  referrer: "origin",
  contentType: "text/html; charset=utf-8",
  csp: { "style-src": ["'unsafe-inline'"], "img-src": ["data:"] },
  refresh: "30",
  revisitAfter: "7 days",
  copyright: "© 2026",
  publisher: "Publisher",
  manifest: "/manifest.json",
  links: [{ rel: "preconnect", href: "https://example.com" }],
};
```

When `pwa: true`, Vistta will expose `./manifest.json` for the route and serve `./worker.js`.

All config keys are applied to the document `<head>` on initial render (SSR/SSG via `createHtml`) and updated client-side on every navigation by `updateConfig` (`packages/js/core/router.js`): `title`, `description`, `keywords`, `robots`, `author`, `language`, `copyright`, `publisher`, and `viewport` map to `<meta name="...">`; `theme` → `<meta name="theme-color">`, `colorScheme` → `<meta name="color-scheme">`, `revisitAfter` → `<meta name="revisit-after">`, `referrer` → `<meta name="referrer">`; `contentType` → `<meta http-equiv="Content-Type">`, `csp` → `<meta http-equiv="Content-Security-Policy">`, `refresh` → `<meta http-equiv="refresh">`; `icon` → all `<link rel$="icon">` (icon + apple-touch-icon); `manifest` → `<link rel="manifest">`; `lang` → `<html lang>`; `href` → `<base href>`; `links` → updates or creates `<link>` elements matched by `rel`+`href`. A page's merged config is also inherited by pages under its path, both on the server and in static builds, so shared design systems (`styles`) only need to be declared once on the root page.

## **API Routes (Controllers)**

Create an `api.js` or `controller.js` file to expose API endpoints under `/api`.

Example:

`app/users/api.js` → `/api/users`

```js
import { Controller, GET, POST, PUT } from "@vistta/js";

export default class UsersApi extends Controller {
  // You can pass a method-local url (relative to this controller route)
  list = GET("/", async function () {
    // Use `function` if you want access to `this.request` / `this.response`
    return { users: [{ id: 1, name: "Ada" }] };
  });

  create = POST("/", async ({ name }) => {
    // Arrow functions work fine if you only need params/body
    return { created: true, name };
  });

  update = PUT("/:id", async function ({ id, ...body }) {
    return { ok: true, id, body };
  });
}
```

Notes:

- If the method url includes params (e.g. `"/:id"`), the handler receives them merged into the argument object.
- For `GET`/`DELETE`, the argument is treated as `params`; for others it's treated as `body`.
- Inside handlers, `this` is a context object: `{ request, response, socket }` (only available when using `function`, not arrow functions).

### **Importing a controller in the frontend**

Vistta can generate a client-side request wrapper for your controller via the loader:

```js
import UsersApi from "./users/api.js" with { type: "api" };

const users = await UsersApi.list();
await UsersApi.update({ id: "123", value: "hello" });
```

This works because the server shares each controller route with the loader, and the `api` loader converts `GET/POST/PUT/...` methods into HTTP requests.
Generated calls resolve to the controller's returned payload directly, not a `{ data }` response wrapper.

Each generated method accepts two arguments:

```js
method(args?, options?)
```

- **`args`** — path params and query params (for `GET`/`DELETE`) or request body (for `POST`/`PUT`/`PATCH`). Path params (e.g. `:id`) are extracted by name; the rest become query params or body.
- **`options`** — `{ controller?, stream?, cache? }`:
  - `controller` — an `AbortController` for cancellation. If omitted, one is created automatically.
  - `stream` — if `true`, returns `{ data: ReadableStream }` instead of buffering the response (see below).
  - `cache` — `false` to bypass cache, `{ force: true }` to force a fresh fetch and update the cache.

#### `.url()`

Every generated method has a `.url(args)` helper that builds the full request URL (with auth token as a `?token=` query param) without making a request:

```js
const url = UsersApi.get.url({ id: "123" });
// → "http://host/api/users/123?token=..."
```

This is useful when you need the URL itself — e.g. passing it to a download manager, opening it in a new tab, or feeding it to a custom `fetch` call.

#### `{ stream: true }`

For large responses (file downloads, etc.), pass `{ stream: true }` to get a `ReadableStream` instead of a buffered `ArrayBuffer`. The response is not buffered into memory — chunks arrive as the network delivers them. Unlike the normal path (which returns `response.data` directly), streaming returns the full response object so you can access headers:

```js
const { data: stream, headers } = await UsersApi.download({ platform: "android" }, { stream: true });
const total = Number(headers.get("content-length")) || 0;
const reader = stream.getReader();
let received = 0;
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  received += value.byteLength;
  // value is a Uint8Array chunk — write it to disk immediately
  if (total) console.log(`${Math.round((received / total) * 100)}%`);
}
```

Streaming bypasses the cache (cached responses are always buffered JSON).

## **WebSockets**

On the server, socket listeners are registered through the `Server` instance (`server.on(event, callback)`) or inside a controller via the injected `this.socket` context. On the client, use the exported `Socket` class.

Server-side (controller):

```js
import { Controller, GET } from "@vistta/js";

export default class Ws extends Controller {
  // `socket` is available inside handler functions and provides
  // `emit`/`on` bound to the controller's subdomain, plus `send` for one socket.
  join = GET("/join", function ({ room, socket }) {
    socket.emit("joined", { room });
    return { ok: true };
  });
}
```

On the server, `server.emit(target, event, ...args)` routes to a connected socket ID first, then a registered subdomain; `"*"` or `""` broadcasts globally. It returns `false` when neither target exists (including an offline socket), and `true` when it emits. `server.emit(event, ...args)` also broadcasts globally when the second argument is not a string; use `"*"` as the target when sending a string payload. In controllers, `socket.emit(event, ...args)` broadcasts to the controller's subdomain, while `socket.send(socketId, event, ...args)` targets one socket and returns the same boolean result.

> **Note:** Use the `socket` handler argument (not `request.socket.emit/on`). The raw `request.socket` is the underlying TCP socket; overriding its `emit`/`on` methods breaks Node.js stream backpressure and causes large `response.sendFile` downloads to stall.

Client-side:

```js
import { Socket } from "@vistta/js";

Socket.connect("https://api.example.com");
Socket.on("joined", ({ room }) => console.log("Joined", room));
Socket.emit("join", { room: "general" });
```

In browsers, omitting the host in `Socket.connect()` connects to the current origin.

By default the page reloads when a dropped connection is restored. Pass an `onReconnect` callback to `Socket.connect` to handle it yourself instead (or `null` to do nothing). `auth` can be a function returning the auth object (or a promise of it); it is called before each connection attempt, so tokens can be refreshed. When the server rejects a connection, it is retried only if the function returns a different value.

On mobile, events are only delivered while the app is in the foreground by default. Pass `{ mobile: { background: true } }` to keep delivering an event while the app is backgrounded:

```js
Socket.on("sync:changed", onSyncChanged, { mobile: { background: true } });
```

On Android, while any such listener is registered, the app runs a foreground service (with its persistent notification) so the connection stays alive; with none, no service runs. Events dropped while backgrounded are not replayed: on resume the socket reports `disconnect` and reconnects, so `onReconnect` runs and the app can resync. Desktop and web always deliver every event, whether or not the window is visible.

The server sends a heartbeat every 60 seconds (Socket.IO default: 25) so idle mobile clients wake the radio less often; a silently dropped connection is detected after up to 80 seconds.

## **Client Router**

Vistta includes a client router used for SPA-style navigation with native View Transitions API support.

```js
import { Router } from "@vistta/js";

await Router.navigate("/about");
await Router.refresh();

Router.on("some-event", (e) => {
  console.log(e.detail);
});
```

Link clicks (`<a href="...">`) are intercepted automatically unless they have `target`, `download`, or point to a different host.

### View Transitions

The router uses the native View Transitions API for smooth page transitions. By default, a crossfade is applied. You can specify a custom transition type per-page or per-navigation:

**Per-page (via config):**

```js
export const config = {
  title: "Settings",
  transition: "slide-left",
};
```

**Per-navigation (programmatic):**

```js
await router.navigate({ href: "/settings", transition: "slide-right" });
```

The `transition` value is set as `data-transition` on the document root during the transition, allowing CSS to target specific animation styles via `::view-transition-old(root)` and `::view-transition-new(root)` pseudo-elements. Built-in transitions: `slide-left`, `slide-right`, `slide-up`, `slide-down`, `none`.

## **UI API**

### `Component`

Vistta components are **instance-based** and are expected to be `Component` instances.

Create components as either:

- **Class components** extending `Component` with a `render()` method (recommended)
- **Function components** returning an object with `render()` (Vistta adapts it into a `Component`)

Key concept: **props become instance fields**, and any instance field is treated as reactive state.
That means values you pass in JSX (e.g. `<Widget value={123} />`) are assigned to `this.value` on the component instance.

In a component instance, `this.children` contains the nested children passed through JSX.

#### Reactivity

Every instance property on a component behaves like a signal — reading it during render subscribes to it, and writing to it triggers a re-render of only the parts of the tree that depend on it. No special wrapper, `.value` accessor, or setter function is needed:

```jsx
import { Component } from "@vistta/js";

export default class Counter extends Component {
  count = 0;

  render() {
    return (
      <>
        <p>{this.count}</p>
        <button onClick={() => this.count++}>Increment</button>
      </>
    );
  }
}
```

Assigning `this.count++` automatically triggers a targeted update — only the expressions that read `this.count` are re-evaluated. The framework tracks dependencies at the property level, so unrelated parts of the tree are never touched.

Use private fields (`#field`) for data that should **not** trigger re-renders when changed:

```jsx
class Example extends Component {
  #cache = new Map(); // internal bookkeeping — no reactivity
  items = []; // reactive — updates the UI when reassigned
}
```

#### Computed Getters

Getter-only properties on a component are automatically memoized. The framework detects `get` accessors without a `set`, tracks their reactive dependencies, and caches the result until a dependency changes.

```jsx
import { Component } from "@vistta/js";

export default class Example extends Component {
  items = [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }];
  filter = "";

  // Only recomputes when this.items or this.filter change
  get filtered() {
    return this.items.filter((i) => i.name.includes(this.filter));
  }

  render() {
    return (
      <>
        <input value={this.filter} onInput={(e) => (this.filter = e.target.value)} />
        <ul>
          {this.filtered.map((item) => (
            <li>{item.name}</li>
          ))}
        </ul>
      </>
    );
  }
}
```

The computed value is accessed directly as a property — no `.value` needed. It re-evaluates only when one of its reactive dependencies fires. Getters that return a `Promise` are excluded from memoization to preserve async/Suspense behavior.

#### Mutation (Reactive Values)

`Mutation` is the framework's unit of recalculation — and also a standalone reactive value you can create outside components. `new Mutation(factory, ...args)` wraps a factory with initial inputs; the value is computed lazily on first read, cached, and re-derived when you call `.update(...)`:

```js
import { Mutation } from "@vistta/js";

const labels = new Mutation((language) => (key) => DATA[key][language], "en");

labels("greeting"); // "Hello"
labels.update("pt");
labels("greeting"); // "Olá"
```

Behavior:

- **Lazy + cached**: the factory runs on first read and only re-runs when dirty. Repeated reads return the cached value.
- **Call-through**: calling with arguments applies them to the value when it is a function (as above, where the value is a translator function).
- **`.update(...args)`**: replaces the inputs, re-derives, and re-runs exactly the DOM expressions that read the value — component renders, `{...}` children, and attribute expressions update on the next frame. A bare `.update()` refreshes with the current inputs without wiping them.
- **Reactive inputs**: reactive reads inside the factory (Contexts, component properties, other Mutations) are tracked — the value re-derives when they change, without `.update()`.
- **Derived values**: a Mutation whose factory reads another Mutation re-derives when its input does.
- **Renderable values**: a Mutation returning a primitive/Element/array/object can be used directly as a JSX child. If the value is a function, call it in the expression (`{labels("greeting")}`).

The renderer-internal mutations behind `prop()`/`child()` expressions are the same class, created through a package-internal path — the public constructor always creates a reactive value.

#### Keys

The `key` prop preserves component identity across renders. When a keyed component is conditionally removed and later re-added, its full state (instance fields, input values, scroll position, etc.) is restored — effectively providing "keep-alive" behavior without a dedicated API.

```jsx
import { Component } from "@vistta/js";

class Tabs extends Component {
  active = "a";

  render() {
    return (
      <>
        <button onClick={() => (this.active = "a")}>Tab A</button>
        <button onClick={() => (this.active = "b")}>Tab B</button>
        {this.active === "a" && <Panel key="panel-a" label="A" />}
        {this.active === "b" && <Panel key="panel-b" label="B" />}
      </>
    );
  }
}
```

Each `Panel` retains its internal state when switching tabs because `key` tells the framework to reuse the existing instance rather than destroy and recreate it.

### `Element` / `Fragment`

JSX compiles to `Element` instances at runtime (and uses the global `element/prop/child` helpers).
You can also create elements directly:

```js
import { Element, Fragment } from "@vistta/js";

const tree = new Element("div", { class: "box" }, "Hello");
const group = new Element(Fragment, {}, "A", "B");
```

#### Namespaced props

`name:key={value}` sets a single key of an object prop. Namespaced props with the same prefix are grouped into one object and stay reactive:

```jsx
<Button style:col="auto" style:width={this.width} />
// same as
<Button style={{ col: "auto", width: this.width }} />
```

Combining `name` and `name:*` on the same element (including through spreads) throws.

Event handlers are the exception: `on:event` expands to the regular `onEvent` prop (first letter capitalized, rest kept as written), so it works for both DOM elements and components:

```jsx
<Button on:click={() => this.save()} on:contextMenu={this.menu} />
// same as
<Button onClick={() => this.save()} onContextMenu={this.menu} />
```

Combining `onClick` and `on:click` on the same element throws.

### `Render.If` and `Render.Each`

```jsx
import { Render } from "@vistta/js";

import { Component } from "@vistta/js";

export default class Example extends Component {
  render() {
    return (
      <>
        <Render.If condition={true}>Visible</Render.If>

        <Render.Each of={["a", "b"]} as={(item, index) => <div key={index}>{item}</div>} />
      </>
    );
  }
}
```

### `Context`

`Context` is a shared state container with optional persistence (`none`, `session`, `local`, `storage`). The default value must be an object and must be serializable.

In Vistta components, the intended pattern is to store the **Context instance** on the component. The renderer will automatically expose a reactive proxy for that context field.

```jsx
import { Component, Context } from "@vistta/js";

const ctx = new Context("global_state", { count: 0 }, { cache: "local" });

export default class Example extends Component {
  // Calling the Context instance returns itself; Vistta detects it and injects a reactive proxy.
  state = ctx();

  render() {
    return (
      <>
        <p>{this.state.count}</p>
        <button onClick={() => this.state.count++}>Increment</button>
      </>
    );
  }
}
```

If you define actions, call them on the Context instance (e.g. `ctx.increment()`), and read/mutate state through the injected proxy in your component (e.g. `this.state.count++`).

#### Events

Use `on()` to subscribe to context events. It returns an unsubscribe function.

```js
// Listen to any successful state change
const off = ctx.on("change", (prev, next) => {
  console.log("State changed from", prev, "to", next);
});

// Listen to a specific action's lifecycle (pending, completed, rejected)
ctx.on("increment", (status, value) => {
  if (status === "completed") console.log("Increment done:", value);
});

// Unsubscribe
off();
```

#### Cross-tab sync

Pass `sync: true` to keep a context in sync across browser tabs. The context listens to the `storage` event and applies incoming values from other tabs, firing proxy and `change` listeners locally. This is only effective when `cache` resolves to `localStorage` (`"local"` or `"storage"`), since the `storage` event does not fire for `sessionStorage` or in-memory caches. Incoming values are applied without being written back to storage, so no cross-tab echo loop occurs.

```jsx
const ctx = new Context("shared_state", { count: 0 }, { cache: "local", sync: true });
```

### `Ref`

```jsx
import { Component, Ref } from "@vistta/js";

const inputRef = new Ref();

export default class Example extends Component {
  render() {
    return <input ref={inputRef} />;
  }
}
```

### `instance`

The `instance` prop is the component counterpart of `ref`: instead of returning the DOM node, it returns the component instance. It accepts a callback (`(instance) => ...`) or an object ref (assigned to `.component`). The instance is available immediately after the component is constructed, before `onConnect`.

```jsx
import { Component, Ref } from "@vistta/js";

export default class Example extends Component {
  render() {
    return <Dropdown instance={(dropdown) => (this.dropdown = dropdown)} />;
  }
}
```

### `Form`

`Form` helps with nested forms, collecting values, and validation.

```jsx
import { Component, Form } from "@vistta/js";

export default class Example extends Component {
  render() {
    return (
      <Form
        onSubmit={(event) => {
          console.log(event.values);
        }}
      >
        <input name="email" type="email" required />
        <button type="submit">Submit</button>
      </Form>
    );
  }
}
```

### `Safe` (error boundary)

Wrap UI with `Safe` to catch errors thrown during rendering/updates.

```jsx
import { Component, Safe } from "@vistta/js";

class MyWidget extends Component {
  render() {
    return <div>Widget</div>;
  }
}

export default class Example extends Component {
  render() {
    return (
      <Safe fallback={(error) => <div>Something went wrong: {error.message}</div>}>
        <MyWidget />
      </Safe>
    );
  }
}
```

`fallback` can be a node or a function `(error) => node`.

### `Suspense` (async rendering)

`Suspense` shows `fallback` while reactive values are pending Promises.

This works especially well with API loader imports:

```jsx
import { Component, Suspense } from "@vistta/js";
import UsersApi from "./users/api.js" with { type: "api" };

export default class Page extends Component {
  users = UsersApi.list().then((users) => users ?? []);

  render() {
    return (
      <Suspense fallback={<p>Loading…</p>}>
        <ul>
          {this.users.map((u) => (
            <li key={u.id}>{u.name}</li>
          ))}
        </ul>
      </Suspense>
    );
  }
}
```

When a component property is a Promise, accessing it during render triggers the nearest `Suspense` boundary.

#### Lazy Components

Since any Promise property triggers Suspense, you can use dynamic `import()` to lazy-load components:

```jsx
import { Component, Suspense } from "@vistta/js";

const HeavyChart = import("./heavy-chart.jsx").then((m) => m.default);

export default class Page extends Component {
  render() {
    return (
      <Suspense fallback={<p>Loading chart…</p>}>
        <HeavyChart data={this.data} />
      </Suspense>
    );
  }
}
```

The component is fetched on demand and renders once the import resolves.

### `requestNextMutation`

Schedules a callback to run after the virtual DOM has applied all mutations queued before it. The callback is enqueued as a mutation and defers via `requestAnimationFrame`, so it always runs in a frame after the pending batch's DOM writes — including batches split across frames by the render budget — without interleaving layout reads with DOM writes. This makes it a safer replacement for `requestAnimationFrame` when doing imperative work that depends on the updated DOM (e.g. measuring `scrollHeight`, scrolling containers, focusing inputs):

```jsx
import { Component, requestNextMutation } from "@vistta/js";

export default class Example extends Component {
  onAdd() {
    this.items = [...this.items, newItem];
    requestNextMutation(() => this.container.scrollTo({ top: this.container.scrollHeight }));
  }
}
```

Note: the callback runs in its own rAF callback, so an uncaught error in it does not affect the mutation queue. No-op on the server.

### `VirtualContainer`

`VirtualContainer` supports two rendering modes:

- **Virtual scroll**: when `rows` and `rowHeight` are provided, renders only the visible rows (with configurable `overscan`).
- **Lazy render**: when only children are provided, renders them only when the container is visible in the viewport.

```jsx
import { Component, VirtualContainer } from "@vistta/js";

export default class Example extends Component {
  render() {
    return (
      <>
        {/* Virtual scroll mode */}
        <VirtualContainer
          type="scroll"
          rows={(index) => <div key={index}>Row {index}</div>}
          rowCount={10000}
          rowHeight={40}
          overscan={10}
          style={{ height: "400px" }}
        />

        {/* Lazy render mode */}
        <VirtualContainer>
          <div>Only rendered when visible in viewport</div>
        </VirtualContainer>
      </>
    );
  }
}
```

### Styling (`style` prop + `@vistta/ui` presets)

Vistta uses [`@vistta/css`](../css/README.md), a framework-independent
runtime style engine that supports `style` as a string, object, or array. It is
installed as a dependency and used automatically by the renderer; existing
`style` props and `import { Style } from "@vistta/js"` continue to work.

The same engine can be used directly in React or a custom renderer via
`import { VirtualStyleSheet, Style } from "@vistta/css"`. See the package
documentation for stylesheet adoption, automatic React `style`-prop integration, and exit-animation
lifecycle integration.

You can also import `.css` files directly. The VISTTA JS CLI's build-time CSS loader converts rules into a style object and exports it as the default export. For simple top-level selectors (like `.my-style` or `button`) it also emits named exports when the selector maps to an object. Nested blocks are supported, and `:scope { ... }` merges its contents into the current level.

To get a great default UI baseline, add `@vistta/ui` styles to your page config:

```js
import { style } from "@vistta/ui";

export const config = {
  styles: [style()],
};
```

Examples:

```jsx
import { Component } from "@vistta/js";
import style, { my_style } from "./style.css";

export default class Example extends Component {
  render() {
    return (
      <>
        <div style={{ container: true, gap: "1rem" }} />
        <div style="col:full; button:(color: red)" />
        <button style={my_style}>Styled from CSS</button>
      </>
    );
  }
}
```

#### Enter & Exit Transitions

Elements can animate when entering or leaving the DOM using `:initial` (enter) and `:exit` (leave) pseudo-selectors inside the `style` prop. No external API or wrapper components needed — just CSS:

```jsx
import { Component } from "@vistta/js";

export default class Example extends Component {
  visible = true;

  render() {
    return (
      <>
        <button onClick={() => (this.visible = !this.visible)}>Toggle</button>
        {this.visible && (
          <div
            style={{
              opacity: 1,
              transition: "opacity 300ms",
              ":initial": { opacity: 0 },
              ":exit": { opacity: 0 },
            }}
          >
            Fades in and out
          </div>
        )}
      </>
    );
  }
}
```

- **`:initial`** maps to CSS `@starting-style` — the browser animates from these values when the element first appears
- **`:exit`** defers DOM removal and applies exit styles via a `[exit-style]` attribute — the element animates out, then is removed after `transitionend`/`animationend`

Both work with `transition` and `animation` properties. If no animation duration is detected, removal happens immediately.

## **Mobile & Desktop Apps**

Vistta.js supports building native mobile (Android) and desktop (Linux/Windows) apps from the same codebase, powered by `@vistta/js-native`.

### **Setup**

1.  **Install dependencies**:

    ```sh
    npm install @vistta/js-native
    ```

2.  **Run the app**:

    ```sh
    # Run on the host platform (default)
    npx vistta run ./app

    # Run on a specific platform
    npx vistta run ./app android
    npx vistta run ./app linux
    npx vistta run ./app windows
    ```

### **Platform Detection**

Platform is exposed on the global `window.platform` (not as a named import). It is one of: `"server"`, `"browser"`, `"mobile"`, `"desktop"`.

```js
if (window.platform === "mobile") {
  // Mobile-specific logic
}
```

### **Native Features**

Vistta provides unified helpers that work across platforms. On native targets they lazily import `@vistta/js-native/plugins`; on the browser they fall back to Web APIs; on the server they no-op.

```jsx
import { Clipboard, Haptics, Notification, Scheduler, File } from "@vistta/js";

// Clipboard (no-op on server, navigator.clipboard on browser, native on desktop)
await Clipboard.writeText("Hello, clipboard!");
const text = await Clipboard.readText();
await Clipboard.writeHtml("<h1>Title</h1>", "Title");
await Clipboard.clear();

// Haptics (no-op on server, navigator.vibrate on browser, native on mobile)
await Haptics.vibrate(20);
await Haptics.impactFeedback("medium");

// Notifications
await Notification.send({ title: "Hello", body: "World" });

// Background timers (Android persists via foreground service)
const id = await Scheduler.setBackgroundInterval(() => console.log("tick"), 60000);

// File helpers (browser)
const file = await File.upload({ accept: ".json" });
await File.download("data.json", await File.read(file, "text"), "application/json");
```

### **Build**

To build your app for production:

```sh
# Build a static web bundle (defaults to ./dist)
npx vistta build ./app

# Build for a native platform (outputs to ./build/www)
npx vistta build ./app app
npx vistta build ./app android
npx vistta build ./app linux
npx vistta build ./app windows
```

In static builds, page config merges exactly like the server: build options, then `config.js` routes and ancestor page configs from the root down, with the most specific config winning. So a `styles` design system (or theme, icon, links) exported from a parent page's config is inherited by all child pages in both the serialized client config and the prerendered `<style data-ssr>` markup.

Static web builds write `<path>/index.html` and `<path>/page.js` under `dist` for each static page and each dynamic page's `config.static.params` entry. The page script is generated once and reused across entries. Prerendering receives each concrete URL, including for static pages. Duplicate output paths fail the build, including collisions between static pages and generated routes. Serve the output with a static host that resolves directory `index.html` files; URLs not enumerated in `config.static.params` are not generated, and no `404.html` fallback is emitted.

Native app builds generate `build/www` with assets, one route module per page, and a client-side route manifest. Dynamic patterns support named and catch-all parameters, including the optional final named parameter. The native web output folder is cleaned before each build.

## **Programmatic Server Usage**

You can use the server directly (without the CLI command):

```js
import Server from "@vistta/js/server";
import fs from "node:fs";

const server = new Server({ http: 3000 });
await server.routes.use("/", fs.realpathSync("./app"));
```

Servers listen on all interfaces by default. Pass `host` to bind a specific address, either for both protocols or per protocol:

```js
// HTTP only on loopback; HTTPS on every interface.
const server = new Server({ http: 3000, https: 3443, cert, key, host: { http: "127.0.0.1" } });
```

`server.stop(protocol)` waits for open connections to end; `server.stop(protocol, { force: true })` destroys them. A stopped protocol can be started again with `server.start(protocol)`.

Same-origin requests and apps built with `@vistta/js-native` work by default for HTTP and WebSockets. Native apps require no CORS setup. Requests without `Origin` remain supported. To enable credentialed requests from another web origin, explicitly allow its exact HTTP(S) origin (including a non-default port):

```js
const server = new Server({ http: 3000, cors: { origins: ["https://app.example.com"] } });
```

Unapproved origins receive HTTP 403 and cannot open WebSocket connections. Behind TLS-terminating proxies, explicitly allow the public origin; forwarded headers are not trusted for this decision. Origin checks are not a substitute for authentication or CSRF tokens.

Custom web/development origins still use `cors.origins`; arbitrary localhost ports, `null`, and wildcards are not automatically allowed. Native compatibility does not replace authentication or authorization. Web-only deployments can disable native access with `cors: { native: false }`; explicitly configured `cors.origins` still apply.

SSR escapes interpolated text, attributes, and page metadata. CSS serialization prevents HTML style-tag breakouts, but untrusted CSS and URLs still require application validation. Cookie values are percent-encoded on write and decoded on read. Internal exceptions return generic errors to clients; details remain available through `server.on("error", ...)`.

Generated pages include a meta CSP with `default-src 'self'`, inline styles, and data images enabled for CSS-in-JS compatibility. This is not a strict CSP: configure the page's `csp` and deployment security headers for your application's trust boundaries.

## **CLI Commands**

After registering the commands in `tsconfig.json` / `jsconfig.json` (see above), you can run:

```sh
# Start a web server from a folder router
npx vistta serve ./app --http=3000

# Build static output (defaults to ./dist)
npx vistta build ./app

# Build for a native platform (outputs to ./build/www)
npx vistta build ./app app
npx vistta build ./app android
npx vistta build ./app linux
npx vistta build ./app windows

# Run on a platform (default target: host platform)
npx vistta run ./app
npx vistta run ./app android
npx vistta run ./app linux
npx vistta run ./app windows

# Run tests in headless Chromium (requires npm install -D @vistta/js-testing)
npx vistta test

# Select a runner explicitly and choose compatible test files
npx vistta test ".\packages\js\tests\client.test.jsx" --environment=browser
npx vistta test ".\packages\cli\tests\*.test.js" --environment=node
```

The `--environment` option belongs to VISTTA JS's test command only. Its default
is `browser`; `node` delegates to the unchanged, Node-only VISTTA CLI test runner.
Select compatible files for each invocation; test imports and suites stay unchanged.

From the `@vistta/js` package directory, `npm test` runs `test:node` and `test:browser`; `npm run tests` remains an alias. Browser validation targets the functional client suite. Performance tests are opt-in via `npm run test:benchmarks` (or `vistta test "tests/benchmarks.test.jsx" --environment=browser --benchmarks`) and are skipped during ordinary discovery.

Public JavaScript subpaths use JSDoc for editor types. TypeScript consumers should enable `allowJs` to infer those types; the existing root declaration remains supported. The companion `@vistta/js-native` and `@vistta/js-testing` packages require framework version 0.0.1 or later; publish their updated peer metadata alongside the framework release.

## **Mobile & Desktop Apps (Native)**

Vistta supports building native apps for Android, Linux, and Windows from the same codebase, powered by `@vistta/js-native`. The same pre-built static bundle is shared across all targets.

### **Setup**

Install the runtime package:

```sh
npm install @vistta/js-native
```

### **Build & Run**

```sh
# Build the app bundle to ./build/www
npx vistta build ./app app
npx vistta build ./app android
npx vistta build ./app linux
npx vistta build ./app windows

# Build and launch on a specific platform
npx vistta run ./app android
npx vistta run ./app linux
npx vistta run ./app windows
```

The build output (`build/www`) is a static bundle with client-side routing via a generated route manifest. The same file-based routing conventions (`page.jsx`, `layout.jsx`, `error.jsx`) apply. By default, the output folder is cleaned before each build.

### **Socket / Server Connection**

Apps connect to a remote backend via Socket.IO. Configure the server URL in your app config:

```js
// app/config.js
export default {
  server: "https://api.example.com",
};
```

### **Platform Detection**

Platform is exposed on the global `window.platform` (not as a named import). It is one of: `"server"`, `"browser"`, `"mobile"`, `"desktop"`.

```js
if (window.platform === "mobile") {
  // Mobile-specific logic
}
```

### **Native Helpers**

Vistta provides unified helpers (`Clipboard`, `Haptics`, `Notification`, `Scheduler`, `File`) that work across platforms. On native targets they lazily import `@vistta/js-native/plugins`; on the browser they fall back to Web APIs (e.g. `navigator.clipboard`, `navigator.vibrate`, `Notification`); on the server they no-op.

```js
import { Clipboard, Haptics, Notification, Scheduler, File } from "@vistta/js";

// Clipboard (no-op on server, navigator.clipboard on browser, native on desktop)
await Clipboard.writeText("Hello, clipboard!");
const text = await Clipboard.readText();
await Clipboard.writeHtml("<h1>Title</h1>", "Title");
await Clipboard.clear();

// Haptics (no-op on server, navigator.vibrate on browser, native on mobile)
await Haptics.vibrate(20);
await Haptics.impactFeedback("medium");
await Haptics.notificationFeedback("success");

// Notifications
await Notification.requestPermission();
await Notification.send({ title: "Hello", body: "World" });

// Background timers (Android persists via foreground service; browser uses setInterval/setTimeout)
const id = await Scheduler.setBackgroundInterval(() => console.log("tick"), 60000);
await Scheduler.clearBackgroundInterval(id);

// File upload/download/read (browser-only helpers)
const file = await File.upload({ accept: ".json" });
await File.download("data.json", await File.read(file, "text"), "application/json");
```

## **Exports**

### Main (`@vistta/js`)

- UI: `Component`, `Element`, `Fragment`, `Suspense`, `Profiler`, `Safe`, `Form`, `Ref`, `Render`, `VirtualContainer`
- State: `Context`, `HistoryContext`, `ThemeContext`
- Styling: `Style`, `Anchor`
- Client: `Router`, `Socket`
- Utilities: `Clipboard`, `File`, `Haptics`, `Notification`, `Scheduler`
- Server/controller helpers: `Controller`, `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `COPY`, `MOVE`, `REST`
- Other: `Worker` (browser-only; throws on server)

> **Note:** Platform detection is not exported as named imports. Use the global `window.platform` (one of `"server"`, `"browser"`, `"mobile"`, `"desktop"`) for platform-specific code.

### Component `props(...exclude)`

Returns all props passed to the component except the specified keys. Use it to forward unhandled props (e.g. event listeners) via JSX spread:

```jsx
const HANDLED_PROPS = ["name", "style"];

class MyComponent extends Component {
  render() {
    return (
      <div
        name={this.name || this.label}
        style={Style.assign(this.style, { position: "relative" })}
        {...this.props("name", "style")}
      >
        {this.children}
      </div>
    );
  }
}
```

### Server (`@vistta/js/server`)

- Default export: `Server`

## **Notes / Caveats**

- `@vistta/js` relies on Vistta's loader/bundler features; use it through `@vistta/cli` for development.
- The exported `Worker` is only available in the browser (in server environment it throws).

## Benchmarks

### Simple GET

Latency (ms): 27
Req/Sec: 36 483
Bytes/Sec (MB): 19

### Simple Page

Latency (ms): 36.57
Req/Sec: 26 958
Bytes/Sec (MB): 38.8

### Performance Tests

Attribute Update:

- Initial Time (ms): 4; Average Time (ms): 0.4; Total (runs/sec): 106

Content Update:

- Initial Time (ms): 6.2; Average Time (ms): 1.4; Total (runs/sec): 91

Element Update With Keys:

- Initial Time (ms): 3.8; Average Time (ms): 3.4; Total (runs/sec): 44

Element Update Without Keys:

- Initial Time (ms): 2.9; Average Time (ms): 3.7; Total (runs/sec): 43

Recursive Update:

- Initial Time (ms): 11.5; Average Time (ms): 0.1; Total (runs/sec): 110

## **License**

Licensed under the GNU General Public License version 3 only (`GPL-3.0-only`). See [LICENSE](LICENSE) for the full terms.

## **Contributing**

Thank you for your interest in contributing to this project! Please ensure that any contributions respect the licensing terms specified. If you encounter any issues or have suggestions, feel free to report them. All issues will be well received and addressed to the best of our ability. We appreciate your support and contributions!

### **Authors**

- [Tiago Terenas Almeida](https://github.com/tiagomta)
