import fs from "@vistta/fs";

const JAVASCRIPT_TYPESCRIPT_EXTENSIONS = [".jsx", ".tsx", ".js", ".ts"];
export const RESOURCES_PATH = "assets";

export function addToPathname(path, target) {
  const pathname = new URL("." + target, new URL(path + (path.endsWith("/") ? "" : "/"), "file://")).pathname;
  return pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
}

export function removeFromPathname(path, target) {
  if (target.startsWith("*")) {
    target = target.slice(1);
    if (path === target) return "/";
    return path.replace(new RegExp(target + "$"), "");
  } else if (target.endsWith("*")) {
    target = target.slice(0, -1);
    path = path.replace(new RegExp(`^${target}`), "");
    return path.startsWith("/") ? path : "/" + path;
  } else path = path.replace(target, "");
}

export function checkIfMoreSpecific(segments, target) {
  const comparedSegments = target.split("/");
  if (segments.length > comparedSegments.length) return true;
  if (segments.length === comparedSegments.length) {
    for (let i = 1, len = segments.length; i < len; i++) {
      const segmentIsDynamic = segments[i].startsWith(":");
      const segmentIsWild = segments[i] === "*";
      const matchedIsDynamic = comparedSegments[i].startsWith(":");
      const matchedIsWild = comparedSegments[i] === "*";
      if (
        (!segmentIsDynamic && !segmentIsWild && (matchedIsDynamic || matchedIsWild)) ||
        (segmentIsDynamic && matchedIsWild) ||
        comparedSegments[i] === ""
      )
        return true;
      if (
        (!matchedIsDynamic && !matchedIsWild && (segmentIsDynamic || segmentIsWild)) ||
        (segmentIsWild && matchedIsDynamic) ||
        segments[i] === ""
      )
        return false;
    }
  }
  return false;
}

export function matchRoute(routes, pathname, options = {}) {
  let { exact, filter } = /** @type {{ exact?: boolean, filter?: (route: any) => boolean }} */ (options);
  const exactSuffix = exact !== false ? "$" : "";
  filter ||= (route) => route.active;
  for (let i = 0, len = routes?.length || 0; i < len; i++) {
    routes[i].match = pathname.match(new RegExp("^" + routes[i].route + exactSuffix));
    if (routes[i].match && filter(routes[i])) return routes[i];
  }
  return null;
}

export async function findRoutes(folder, basepath, entries, resources) {
  const files = await fs.readdir(folder, { recursive: true });
  for (let i = 0, len = files.length; i < len; i++) {
    const file = files[i].replace(/\\/g, "/");
    const filepath = fs.resolve(folder, file);
    const extname = fs.extname(filepath);
    const isResource = fs.contains(filepath, RESOURCES_PATH);
    if (fs.isDirectory(filepath) || !(JAVASCRIPT_TYPESCRIPT_EXTENSIONS.includes(extname) || isResource)) continue;
    const paths = file.replace(/\.[^.]+$/, "").split("/");
    const pathsLen = paths.length;
    if (pathsLen == 1 && !isResource) {
      if (entries[paths[0]]) entries[paths[0]].push([paths[0], addToPathname(basepath, "/"), filepath]);
      continue;
    }
    let pathname = "";
    for (let i2 = 0; i2 < pathsLen; i2++) {
      const path = paths[i2];
      if (i2 == pathsLen - 1) break;
      if (!path.endsWith("]")) pathname += "/" + path;
      else if (path.startsWith("[...")) {
        pathname += "/*";
        break;
      } else if (path.startsWith("[")) pathname += "/:" + path.slice(1, -1);
      else pathname += "/" + path.slice(0, -1);
    }
    if (isResource) resources[addToPathname(basepath, pathname) + "/" + fs.basename(filepath)] = filepath;
    else if (entries[paths[pathsLen - 1]])
      entries[paths[pathsLen - 1]].push([paths[pathsLen - 1], addToPathname(basepath, pathname), filepath]);
  }
  return entries;
}
