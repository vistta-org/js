# **VISTTA JS**

Vistta.js is a convention-driven JavaScript framework for building web (SSR + hydration), mobile (Android/iOS), and desktop (Linux/Windows/MacOS) apps with an instance-based JSX UI model, file-based routing, and built-in server features.

## **Features**

- **Component-first UI (instance-based)**: components are `Component` instances. Use class components that extend `Component` (recommended), or function components that return an object with `render()` (adapted into a `Component` internally).
- **Props-as-state model**: there is no strict props/state split — any component instance property is reactive state, and any prop you pass in JSX is assigned onto the component instance.
- **Convention-driven app structure**: routing, layouts, errors, middleware, and config are discovered from files (`page`, `layout`, `error`, `middleware`, `config`).
- **File-based routing**: `page`, `layout`, `error`, `middleware`, `config` conventions.
- **SSR + hydration**: server renders HTML, client router hydrates and navigates.
- **API routes/controllers**: structured endpoints with `get/post/put/...` helpers.
- **Typed API imports (loader-powered)**: import a controller file in the frontend `with { type: "api" }` to get a client request wrapper generated automatically.
- **WebSockets**: server-side events via `socket.on(...)`.
- **Client router**: SPA-like navigation, link interception, refresh, events, with native View Transitions API for smooth page crossfades.
- **Shared state (`Context`)**: shared state container with optional persistence (`local`, `session`, `indexed`) and reactive proxying.
- **Async UI**: `Suspense` for Promise-backed reactive values.
- **Error boundaries & forms**: `Safe` error boundary, `Form` value collection + validation.
- **Virtual lists**: `VirtualContainer` with virtual scroll (renders only visible rows) and lazy render (IntersectionObserver) modes.
- **CSS-in-JS styling**: built-in style engine via the `style` prop (string/object/array) with enter/exit transitions (`:initial`/`:exit`), plus optional `@vistta/ui` presets, plus a CSS loader that converts `.css` into style objects.
- **Desktop option**: Electron runner for desktop apps.
- **Mobile & Desktop apps**: Capacitor-based builds for Android and iOS, plus direct Electron for desktop — all from the same codebase with client-side routing via a generated route manifest.
- **Platform detection**: `platform`, `isServer`, `isBrowser`, `isMobile`, `isDesktop`, `isApp` exports for cross-platform code.
- **Native plugin bridges**: opt-in wrappers for Capacitor plugins (camera, haptics, filesystem, status bar, splash screen, app lifecycle).
- **CLI + loaders**: works with `@vistta/cli` (bundler/loaders like `api`) and enables extra commands (`serve`, `build`, `run`, `test`).

This package is designed to be used with `@vistta/cli` (peer dependency), which provides the loader/bundler features used by Vistta (e.g. `import ... with { type: "bundler" }`).

## **Requirements**

- Node.js `>= 22`
- `@vistta/cli` installed in your project (peer dependency)
- For mobile apps: `@capacitor/core` and `@capacitor/cli` (peer dependencies)
- For desktop apps: `electron` (peer dependency)

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

Given a base folder passed to `server.use("/", folder)`, Vistta detects the following route files:

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

### **Static assets**

Files inside an `assets/` folder are served as static resources.

Example:

- `app/assets/logo.svg` → `/assets/logo.svg` (relative to the mounted basepath)

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
};
```

When `pwa: true`, Vistta will expose `./manifest.json` for the route and serve `./worker.js`.

## **API Routes (Controllers)**

Create an `api.js` or `controller.js` file to expose API endpoints under `/api`.

Example:

`app/users/api.js` → `/api/users`

```js
import { Controller, get, post, put } from "@vistta/js";

export default class UsersApi extends Controller {
  // You can pass a method-local url (relative to this controller route)
  list = get("/", async function () {
    // Use `function` if you want access to `this.request` / `this.response`
    return { users: [{ id: 1, name: "Ada" }] };
  });

  create = post("/", async ({ name }) => {
    // Arrow functions work fine if you only need params/body
    return { created: true, name };
  });

  update = put("/:id", async function ({ id, ...body }) {
    return { ok: true, id, body };
  });
}
```

Notes:

- If the method url includes params (e.g. `"/:id"`), the handler receives them merged into the argument object.
- For `get`/`delete`, the argument is treated as `params`; for others it's treated as `body`.
- Inside handlers, `this` is a context object: `{ request, response, socket }` (only available when using `function`, not arrow functions).

### **Importing a controller in the frontend**

Vistta can generate a client-side request wrapper for your controller via the loader:

```js
import UsersApi from "./users/api.js" with { type: "api" };

const { data } = await UsersApi.list();
await UsersApi.update({ id: "123", value: "hello" });
```

This works because the server shares each controller route with the loader, and the `api` loader converts `get/post/put/...` methods into HTTP requests.

## **WebSockets**

On the server, you can register listeners using the exported `socket.on` helper inside a controller file.

```js
import { Controller, socket } from "@vistta/js";

export default class Ws extends Controller {
  join = socket.on("join", function ({ room }) {
    // `this` depends on socket.io context
    this.join(room);
  });
}
```

## **Client Router**

Vistta includes a client router used for SPA-style navigation with native View Transitions API support.

```js
import { router } from "@vistta/js";

await router.navigate("/about");
await router.refresh();

router.on("some-event", (e) => {
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

`Context` is a shared state container with optional persistence (`local`, `session`, `indexed`). The default value must be an object and must be serializable.

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
  users = UsersApi.list().then((r) => r.data?.users ?? []);

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

Vistta includes a style engine that supports `style` as a string, object, or array.

You can also import `.css` files directly. The CSS loader converts rules into a style object and exports it as the default export. For simple top-level selectors (like `.my-style` or `button`) it also emits named exports when the selector maps to an object. Nested blocks are supported, and `:scope { ... }` merges its contents into the current level.

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

Vistta.js supports building native mobile (iOS/Android) and desktop (Electron) apps from the same codebase.

### **Setup**

1.  **Install dependencies**:

    ```sh
    # For mobile
    npm install @capacitor/core @capacitor/cli
    # For desktop
    npm install electron
    ```

2.  **Run the app**:

    ```sh
    # Run on desktop (Electron)
    npx vistta run desktop ./app

    # Run on mobile (Android/iOS)
    npx vistta run android ./app
    npx vistta run ios ./app
    ```

### **Platform Detection**

You can use the `platform` export to detect the current environment:

```jsx
import { platform, isMobile, isDesktop, isBrowser } from "@vistta/js";

if (isMobile) {
  // Mobile-specific logic
}
```

### **Native Features**

Vistta provides a unified integration layer for native features. These are automatically available when running on mobile or desktop:

```jsx
import { haptics, camera, filesystem } from "@vistta/js";

// Haptics (Mobile only)
await haptics.impact();

// Camera (Mobile only)
const photo = await camera.getPhoto();

// Filesystem (Mobile & Desktop)
await filesystem.writeFile({
  path: "test.txt",
  data: "Hello World",
  directory: "DOCUMENTS",
});
```

### **Build**

To build your app for production:

```sh
# Build for desktop
npx vistta build ./app desktop

# Build for mobile
npx vistta build ./app mobile
```

The build process generates a unified `build` folder (relative to your app folder) containing your app's assets and a route manifest for client-side navigation. By default, the output folder is cleaned before each build. You can disable this with `--no-clean`.

## **Programmatic Server Usage**

You can use the server directly (without the CLI command):

```js
import Server from "@vistta/js/server";
import fs from "node:fs";

const server = new Server({ http: 3000 });
await server.use("/", fs.realpathSync("./app"));
```

## **CLI Commands**

After registering the commands in `tsconfig.json` / `jsconfig.json` (see above), you can run:

```sh
# Start a web server from a folder router
npx vistta serve ./app --http=3000

# Build static output (defaults to ./app/build)
npx vistta build ./app

# Build for desktop (Electron)
npx vistta build ./app desktop

# Build for mobile (Capacitor)
npx vistta build ./app mobile

# Run on a platform (default target: desktop)
npx vistta run ./app
npx vistta run ./app desktop
npx vistta run ./app android
npx vistta run ./app ios

# Run tests (using the Vistta test runner)
npx vistta test
```

## **Mobile & Desktop Apps (Capacitor)**

Vistta supports building mobile (Android/iOS) apps using [Capacitor](https://capacitorjs.com/) and desktop apps using [Electron](https://www.electronjs.org/) directly. The same pre-built static bundle is shared across all targets.

### **Setup**

No manual setup needed. When you run `vistta run ./app android` (or `ios`), the CLI automatically:

1. Installs `@capacitor/core` and `@capacitor/cli` if missing
2. Prompts for App ID and name if `capacitor.config.ts` doesn't exist
3. Installs the platform package (`@capacitor/android` or `@capacitor/ios`) if missing
4. Adds the platform directory if it doesn't exist

For desktop, `electron` is installed automatically on first run.

### **Build & Run**

```sh
# Build the app bundle to ./app/build/
npx vistta build ./app desktop
npx vistta build ./app mobile

# Build, sync, and open a specific platform
npx vistta run ./app android
npx vistta run ./app ios
npx vistta run ./app desktop
```

The build output (`build/`) is a static bundle with client-side routing via a generated route manifest. The same file-based routing conventions (`page.jsx`, `layout.jsx`, `error.jsx`) apply. By default, the output folder is cleaned before each build. You can disable this with `--no-clean`.

### **Socket / Server Connection**

Apps connect to a remote backend via Socket.IO. Configure the server URL in your app config:

```js
// app/config.js
export default {
  server: "https://api.example.com",
};
```

### **Platform Detection**

Import platform constants to conditionally adapt behavior:

```js
import { platform, isApp, isMobile, isDesktop, isBrowser, isServer } from "@vistta/js";

if (isMobile) {
  // Mobile-specific logic
}
```

`platform` is one of: `"server"`, `"browser"`, `"mobile"`, `"desktop"`.

### **Native Plugin Bridges**

Vistta provides opt-in wrappers around Capacitor plugins. Install the corresponding `@capacitor/*` package and import:

```js
import { takePhoto, pickImage } from "@vistta/js/capacitor/camera";
import { impact, notification, vibrate } from "@vistta/js/capacitor/haptics";
import { readFile, writeFile, deleteFile, mkdir, readdir } from "@vistta/js/capacitor/filesystem";
import { onStateChange, onBackButton, getInfo, exit } from "@vistta/js/capacitor/app";
import { setStyle, setBackgroundColor, hide, show } from "@vistta/js/capacitor/status-bar";
import { hide as hideSplash, show as showSplash } from "@vistta/js/capacitor/splash-screen";
```

All bridges are lazy-loaded and no-op or throw on unsupported platforms. Required Capacitor plugin packages:

| Bridge                    | Package                    |
| ------------------------- | -------------------------- |
| `capacitor/camera`        | `@capacitor/camera`        |
| `capacitor/haptics`       | `@capacitor/haptics`       |
| `capacitor/filesystem`    | `@capacitor/filesystem`    |
| `capacitor/app`           | `@capacitor/app`           |
| `capacitor/status-bar`    | `@capacitor/status-bar`    |
| `capacitor/splash-screen` | `@capacitor/splash-screen` |

## **Exports**

### Main (`@vistta/js`)

- UI: `Component`, `Element`, `Fragment`, `Suspense`, `Profiler`, `Safe`, `Form`, `Ref`, `Render`, `VirtualContainer`
- State: `Context`
- Client: `router`
- Platform: `platform`, `isServer`, `isBrowser`, `isMobile`, `isDesktop`, `isApp`
- Server/controller helpers: `Controller`, `get`, `post`, `put`, `patch`, `del`, `copy`, `move`, `socket`

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

### Capacitor Bridges (`@vistta/js/capacitor/*`)

- `camera`: `takePhoto`, `pickImage`
- `haptics`: `impact`, `notification`, `vibrate`
- `filesystem`: `readFile`, `writeFile`, `deleteFile`, `mkdir`, `readdir`
- `app`: `onStateChange`, `onBackButton`, `getInfo`, `exit`
- `status-bar`: `setStyle`, `setBackgroundColor`, `hide`, `show`
- `splash-screen`: `hide`, `show`

## **Notes / Caveats**

- `@vistta/js` relies on Vistta's loader/bundler features; use it through `@vistta/cli` for development.
- The exported `worker` is only available in the browser (in server environment it throws).

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

Apache 2.0 with Commons Clause

## **Contributing**

Thank you for your interest in contributing to this project! Please ensure that any contributions respect the licensing terms specified. If you encounter any issues or have suggestions, feel free to report them. All issues will be well received and addressed to the best of our ability. We appreciate your support and contributions!

### **Authors**

- [Tiago Terenas Almeida](https://github.com/tiagomta)
