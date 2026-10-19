import { Loader } from "@vistta/cli";
import fs from "@vistta/fs";
import { RESOURCES_PATH } from "../../utils/index.js";

export default class StyleLoader extends Loader {
  async load(source, { path }) {
    try {
      const style = parseCssToStyle(source);
      const resources = [];
      replaceUrlsInStyle(style, path, resources);
      let code = `const style = ${JSON.stringify(style)};\n`;
      code += `export default style;\n`;
      const keys = Object.keys(style);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i].replace(/-/g, "_");
        if (key[0] === ".") key = key.slice(1);
        if (key.indexOf(".") !== -1 || typeof style[keys[i]] !== "object") continue;
        code += `export const ${key} = style[${JSON.stringify(keys[i])}];\n`;
      }
      return { code, resources };
    } catch (e) {
      return { errors: [`${path}(0,0): style error: ${e.message}`] };
    }
  }
}

//

function parseCssToStyle(source) {
  const cleaned = removeComments(source);
  return parseRules(cleaned);
}

function removeComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseRules(source) {
  const rules = {};
  let i = 0;
  while (i < source.length) {
    i = skipWhitespace(source, i);
    if (i >= source.length) break;
    const selectorStart = i;
    const selectorEnd = findSelectorEnd(source, i);
    if (selectorEnd === -1) break;
    const selector = source.slice(selectorStart, selectorEnd).trim();
    i = selectorEnd;
    if (source[i] === ";") {
      i++;
      continue;
    }
    if (source[i] !== "{") break;
    const block = readBlock(source, i);
    i = block.end;
    if (!selector) continue;

    if (selector[0] === "@") {
      const value = parseAtRule(selector, block.body);
      if (value != null) mergeStyle(rules, selector.trim(), value);
      continue;
    }

    const selectors = splitSelectors(selector);
    const blockContent = parseBlockContent(block.body);
    for (let s = 0; s < selectors.length; s++) {
      const sel = selectors[s].trim();
      if (!sel) continue;
      if (sel === ":scope") {
        mergeObjects(rules, blockContent);
        continue;
      }
      mergeStyle(rules, sel, blockContent);
    }
  }
  return rules;
}

function parseAtRule(selector, body) {
  const lower = selector.toLowerCase();
  if (lower.startsWith("@media") || lower.startsWith("@supports") || lower.startsWith("@document")) return parseRules(body);
  if (lower.startsWith("@keyframes") || lower.startsWith("@-webkit-keyframes")) return parseRules(body);
  if (lower.startsWith("@font-face")) return parseDeclarations(body);
  return parseRules(body);
}

function parseDeclarations(body) {
  const declarations = {};
  const tokens = splitByTopLevel(body, ";");
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();
    if (!token) continue;
    const colonIndex = findTopLevelColon(token);
    if (colonIndex === -1) continue;
    const prop = token.slice(0, colonIndex).trim();
    const value = token.slice(colonIndex + 1).trim();
    if (!prop) continue;
    declarations[prop] = value;
  }
  return declarations;
}

function parseBlockContent(body) {
  const declarations = {};
  const nested = {};
  let i = 0;
  while (i < body.length) {
    i = skipWhitespace(body, i);
    if (i >= body.length) break;
    const tokenEnd = findTopLevelTokenEnd(body, i);
    if (tokenEnd === -1) break;
    const token = body.slice(i, tokenEnd).trim();
    const endChar = body[tokenEnd];
    if (endChar === ";") {
      const colonIndex = findTopLevelColon(token);
      if (colonIndex !== -1) {
        const prop = token.slice(0, colonIndex).trim();
        const value = token.slice(colonIndex + 1).trim();
        if (prop) declarations[prop] = value;
      }
      i = tokenEnd + 1;
      continue;
    }
    if (endChar === "{") {
      const block = readBlock(body, tokenEnd);
      i = block.end;
      if (!token) continue;

      if (token[0] === "@") {
        const value = parseAtRule(token, block.body);
        if (value != null) mergeStyle(nested, token.trim(), value);
        continue;
      }

      const selectors = splitSelectors(token);
      const nestedContent = parseBlockContent(block.body);
      for (let s = 0; s < selectors.length; s++) {
        const sel = selectors[s].trim();
        if (!sel) continue;
        if (sel === ":scope") {
          mergeObjects(declarations, nestedContent);
          continue;
        }
        mergeStyle(nested, sel, nestedContent);
      }
      continue;
    }
    i = tokenEnd + 1;
  }
  if (Object.keys(nested).length === 0) return declarations;
  return { ...declarations, ...nested };
}

function splitSelectors(selector) {
  return splitByTopLevel(selector, ",");
}

function splitByTopLevel(source, separator) {
  const parts = [];
  let current = "";
  let quote = null;
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (isQuoteEnd(source, quote, i)) quote = null;
      current += char;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && char === separator) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) parts.push(current);
  return parts;
}

function findTopLevelTokenEnd(source, start) {
  let quote = null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (isQuoteEnd(source, quote, i)) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === ";" || char === "{")) return i;
  }
  return -1;
}

function findSelectorEnd(source, start) {
  let quote = null;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (isQuoteEnd(source, quote, i)) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{" || char === ";") return i;
  }
  return -1;
}

function readBlock(source, start) {
  let i = start + 1;
  let depth = 1;
  let quote = null;
  while (i < source.length) {
    const char = source[i];
    if (quote) {
      if (isQuoteEnd(source, quote, i)) quote = null;
    } else if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return {
    body: source.slice(start + 1, i),
    end: i + 1,
  };
}

function findTopLevelColon(token) {
  let quote = null;
  let depth = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    if (quote) {
      if (isQuoteEnd(token, quote, i)) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === ":" && depth === 0) return i;
  }
  return -1;
}

function mergeStyle(target, selector, value) {
  const existing = target[selector];
  if (!existing) {
    target[selector] = cloneStyleValue(value);
    return;
  }
  if (isPlainObject(existing) && isPlainObject(value)) {
    mergeObjects(existing, value);
    return;
  }
  target[selector] = cloneStyleValue(value);
}

function mergeObjects(target, source) {
  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const cur = source[key];
    if (isPlainObject(target[key]) && isPlainObject(cur)) mergeObjects(target[key], cur);
    else target[key] = cloneStyleValue(cur);
  }
}

function cloneStyleValue(value) {
  if (isPlainObject(value)) return { ...value };
  if (Array.isArray(value)) return value.slice();
  return value;
}

function isPlainObject(value) {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function skipWhitespace(source, index) {
  while (index < source.length && source[index].trim() === "") index++;
  return index;
}

function isQuoteEnd(str, type, index) {
  if (str[index] === type) {
    let count = 0;
    index--;
    while (str[index] === "\\") {
      count++;
      index--;
    }
    return count % 2 === 0;
  }
  return false;
}

function replaceUrlsInStyle(style, basePath, resources, seen = new Set()) {
  if (!isPlainObject(style)) return;
  const keys = Object.keys(style);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = style[key];
    if (typeof value === "string") {
      style[key] = replaceUrlsInValue(value, basePath, resources, seen);
      continue;
    }
    if (Array.isArray(value)) {
      for (let j = 0; j < value.length; j++) {
        if (typeof value[j] === "string") {
          value[j] = replaceUrlsInValue(value[j], basePath, resources, seen);
        } else if (isPlainObject(value[j])) {
          replaceUrlsInStyle(value[j], basePath, resources, seen);
        }
      }
      continue;
    }
    if (isPlainObject(value)) replaceUrlsInStyle(value, basePath, resources, seen);
  }
}

function replaceUrlsInValue(value, basePath, resources, resourceMap) {
  return value.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote, rawUrl) => {
    const url = rawUrl.trim();
    if (!url) return match;
    if (isExternalUrl(url)) return match;
    const resourcePath = fs.resolve(fs.dirname(basePath), url);
    const fileId = fs.fileId(resourcePath);
    if (!fileId) return match;
    const urlHash = fileId + fs.extname(resourcePath);
    if (!resourceMap.has(urlHash)) {
      resourceMap.add(urlHash);
      resources.push({ path: resourcePath, hash: urlHash });
    }
    return `url(${quote || ""}/${RESOURCES_PATH}/${urlHash}${quote || ""})`;
  });
}

function isExternalUrl(url) {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}
