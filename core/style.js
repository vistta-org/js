import { BoundClass, join } from "@vistta/utils";

/**
 * Style definition object ruke.
 * @typedef {Object<string, StyleDefinition|string>} StyleDefinition
 */

/**
 * A stylesheet definition, which can be a file or an object mapping style rules to CSS style declarations.
 * @typedef {string|StyleDefinition} Stylesheet
 */

const PSEUDO_CLASSES = {
  root: "&:root",
  after: "&::after",
  before: "&::before",
  "first-letter": "&::first-letter",
  "first-line": "&::first-line",
  selection: "&::selection",
  backdrop: "&::backdrop",
  placeholder: "&::placeholder",
  link: "&:link",
  visited: "&:visited",
  active: "&:active",
  checked: "&:checked",
  disabled: "&:disabled",
  valid: "&:valid",
  invalid: "&:invalid",
  optional: "&:optional",
  required: "&:required",
  "read-only": "&:read-only",
  empty: "&:empty",
  enabled: "&:enabled",
  focus: "&:focus",
  "focus-within": "&:focus-within",
  hover: "&:hover",
  "in-range": "&:in-range",
  "out-of-range": "&:out-of-range",
  indeterminate: "&:indeterminate",
  first: "&:first-child",
  last: "&:last-child",
  "only-child": "&:only-child",
  "first-child": "> *:first-child",
  "last-child": "> *:last-child",
};

const PSEUDO_FUCTIONS = [
  "is",
  "not",
  "has",
  "dir",
  "lang",
  "host",
  "where",
  "nth-col",
  "nth-child",
  "nth-of-type",
  "nth-last-col",
  "host-context",
  "nth-last-child",
  "nth-last-of-type",
];

const VALUE_REGEX = new RegExp("\\$[^,){}\\s]+");

export class VirtualStyleSheet extends BoundClass {
  #instance;
  #styles = {};
  #count = 0;
  #animations = {};
  #properties = {};
  #queries = {};
  #addExternalStylesheet;

  get stylesheet() {
    return this.#instance;
  }

  constructor(addStyleSheet) {
    super();
    this.#instance = new CSSStyleSheet();
    this.#addExternalStylesheet = addStyleSheet;
  }

  add(style) {
    const { vars = {}, properties = {}, queries = {}, fonts = {}, animations = {}, ...selectors } = style;
    let keys = Object.keys(selectors);
    for (let i = keys.length - 1; i >= 0; i--) {
      const value = selectors[keys[i]];
      const typeofValue = typeof value;
      if (keys[i] === "root") keys[i] = ":root";
      if (typeofValue === "string" || typeofValue === "number")
        this.#insertRule(`${keys[i]} { ${stringToStyle(value)[1]} }`);
      else if (typeofValue === "object") {
        if (Array.isArray(value)) this.#insertRule(`${keys[i]} { ${stringToStyle(join(value, "; "))[1]} }`);
        else this.#insertRule(`${keys[i]} { ${objectToStyle(value)[1]} }`);
      }
    }

    keys = Object.keys(vars);
    for (let i = 0, len = keys.length; i < len; i++) {
      const value = vars[keys[i]];
      const typeofValue = typeof value;
      if (typeofValue === "string" || typeofValue === "number")
        this.#insertRule(`@property --${keys[i]} { initial-value: ${formatValue(value)}; inherits: true; syntax: '*'; }`);
      else if (typeofValue === "object") {
        if (Array.isArray(value))
          this.#insertRule(
            `@property --${keys[i]} { initial-value: ${formatValue(join(value, " "))}; inherits: true; syntax: '*'; }`,
          );
        else
          this.#insertRule(
            `@property --${keys[i]} { initial-value: ${formatValue(value.value || value["initial-value"])}; inherits: ${
              value.inherits ?? "true"
            }; syntax: '${value.syntax ?? "*"}'; }`,
          );
      }
    }

    keys = Object.keys(fonts);
    for (let i = 0, len = keys.length; i < len; i++) {
      const font = keys[i];
      const value = fonts[font];
      const typeofValue = typeof value;
      if (typeofValue === "string")
        this.#insertRule(`@font-face { font-family: '${font}'; src: ${value}; font-display: 'auto'; }`);
      else if (typeofValue === "object") {
        if (Array.isArray(value))
          this.#insertRule(`@font-face { font-family: '${font}'; src: ${join(value, " ")}; font-display: 'auto'; }`);
        else
          this.#insertRule(
            `@font-face { font-family: '${font}'; src: ${value.src}; font-display: '${value.display || "auto"}'; }`,
          );
      }
    }

    keys = Object.keys(animations);
    for (let i = 0, len = keys.length; i < len; i++) {
      const animation = keys[i];
      const value = animations[animation];
      if (typeof value !== "object" || Array.isArray(value)) continue;
      this.#insertRule(`@keyframes ${animation} { ${objectToStyle(value)[1]} }`);
    }

    keys = Object.keys(properties);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (typeof properties[keys[i]] !== "object") continue;
      const values = Object.keys(properties[keys[i]]);
      const styleValues = {};
      for (let j = 0, vlen = values.length; j < vlen; j++) {
        const value = properties[keys[i]][values[j]];
        const typeofValue = typeof value;
        if (typeofValue === "string")
          styleValues[values[j]] = stringToStyle(value, { createAnimation: (value) => this.createAnimation(value) })[1];
        else if (typeofValue === "object") {
          if (Array.isArray(value))
            styleValues[values[j]] = stringToStyle(join(value, "; "), {
              createAnimation: (value) => this.createAnimation(value),
            })[1];
          else styleValues[values[j]] = objectToStyle(value, { createAnimation: (value) => this.createAnimation(value) })[1];
        }
      }
      this.#properties[keys[i]] = (value) => {
        if (styleValues[value]) return styleValues[value];
        if (styleValues["*"]) return styleValues["*"].replace(/\$\{\}/g, formatValue(value));
        return "";
      };
    }

    keys = Object.keys(queries);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (typeof queries[keys[i]] !== "string") continue;
      this.#queries[keys[i]] = (style) => `@media ${queries[keys[i]]} { ${style.trim()} }`;
    }
  }

  resolve(value) {
    let style;
    const typeofValue = typeof value;
    if (typeofValue === "string")
      [value, style] = stringToStyle(value, {
        properties: this.#properties,
        queries: this.#queries,
        createAnimation: (value) => this.createAnimation(value),
      });
    else if (typeofValue === "object") {
      if (Array.isArray(value))
        [value, style] = stringToStyle(join(value, "; "), {
          properties: this.#properties,
          queries: this.#queries,
          createAnimation: (value) => this.createAnimation(value),
        });
      else
        [value, style] = objectToStyle(value, {
          properties: this.#properties,
          queries: this.#queries,
          addScope: (style) => this.#addExternalStylesheet(style, true),
          createAnimation: (value) => this.createAnimation(value),
        });
    } else return "";
    if (style) {
      let id = this.#styles[style];
      if (!id) {
        this.#styles[style] = id = uniqueString(this.#count++);
        this.#insertRule(`[style*="${id}"] { ${style}}`);
      }
      value += id + " ";
    }
    return value.slice(0, -1);
  }

  setProperty(element, property, value, priority) {
    value = formatValue(value, priority === "important");
    const styleAttr = element.attributes.style;
    if (!styleAttr) return element.setAttribute("style", `${property}: ${value};`);
    const current = styleAttr.nodeValue;
    const searchStr = `${property}:`;
    let start = current.indexOf(searchStr);
    if (start === -1) {
      const separator = current && !current.endsWith(";") ? "; " : "";
      styleAttr.nodeValue = current + separator + `${property}: ${value};`;
    } else {
      const end = current.indexOf(";", start) + 1;
      const newValue = current.slice(0, start) + `${property}: ${value};` + current.slice(end);
      styleAttr.nodeValue = newValue.trim();
    }
  }

  createAnimation(value) {
    const matches = {
      "animation-composition": value.match(/composition:([^;]+);/),
      "animation-delay": value.match(/delay:([^;]+);/),
      "animation-direction": value.match(/direction:([^;]+);/),
      "animation-duration": value.match(/duration:([^;]+);/),
      "animation-iteration-count": value.match(/iteration-count:([^;]+);/),
      "animation-fill-mode": value.match(/fill-mode:([^;]+);/),
      "animation-play-state": value.match(/play-state:([^;]+);/),
      "animation-range": value.match(/range:([^;]+);/),
      "animation-range-end": value.match(/range-end:([^;]+);/),
      "animation-range-start": value.match(/range-start:([^;]+);/),
      "animation-timeline": value.match(/timeline:([^;]+);/),
      "animation-timing-function": value.match(/timing-function:([^;]+);/),
    };
    let style = "";
    const keys = Object.keys(matches);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (!matches[keys[i]]) continue;
      value = value.replace(matches[keys[i]][0], "");
      style += `${keys[i]}: ${matches[keys[i]][1].trim()}; `;
    }
    value = value.trim();
    if (!this.#animations[value]) {
      const name = "custom-animation-" + Object.keys(this.#animations).length;
      this.#animations[value] = name;
      this.#insertRule(`@keyframes ${name} { ${value}}`);
    }
    return `animation-name: ${this.#animations[value]}; ${style}`;
  }

  #insertRule(rule) {
    this.#instance.insertRule(rule, this.#instance.cssRules.length);
  }
}

function stringToStyle(value, options = {}) {
  let selectors = "";
  let style = "";
  let [key, val, rest] = extractKeyValueFromString(value);
  while (key) {
    if (val?.startsWith("(") && val?.endsWith(")"))
      style += format(key, stringToStyle(val.slice(1, -1), options)[1], { ...options, selector: true })[1] + " ";
    else style += format(key, val ?? "default", { ...options, selector: false })[1] + " ";
    [key, val, rest] = extractKeyValueFromString(rest);
  }
  return [selectors, style];
}

function objectToStyle(value, { properties, queries, addScope, createAnimation } = {}) {
  let selectors = "";
  let style = "";
  const keys = Object.keys(value);
  for (let i = 0, len = keys.length; i < len; i++) {
    let key = keys[i];
    let cur = value[key];
    const typeofValue = typeof cur;
    if (key.startsWith("style-") && addScope) {
      key = key.slice(6);
      addScope(key);
      selectors += `${key} `;
      continue;
    }
    if (typeofValue === "string" || typeofValue === "number")
      style += format(key, cur, { properties, queries, selector: false, createAnimation })[1] + " ";
    else if (typeofValue === "boolean" && cur === true)
      style += format(key, "default", { properties, queries, selector: false, createAnimation })[1] + " ";
    else if (typeofValue === "object") {
      if (Array.isArray(cur)) style += format(key, join(cur, " "), { properties, queries, selector: false, createAnimation })[1] + " ";
      else
        style +=
          format(key, objectToStyle(cur, { properties, queries, createAnimation })[1], { properties, queries, selector: true, createAnimation })[1] + " ";
    }
  }
  return [selectors, style];
}

function format(key, value, { properties = {}, queries = {}, selector, createAnimation } = {}) {
  if (!selector) {
    if (properties[key]) return [null, properties[key](value)];
    return [null, `${key.startsWith("$") ? "--" + key.slice(1) : key}:${formatValue(value)};`];
  }
  if (key === "animation") return [null, createAnimation(value)];
  if (queries[key]) return [null, queries[key](value) + " "];
  if (PSEUDO_CLASSES[key]) return [null, `${PSEUDO_CLASSES[key]} { ${value}}`];
  for (let i = 0, len = PSEUDO_FUCTIONS.length; i < len; i++)
    if (key.startsWith(PSEUDO_FUCTIONS[i] + "(") && key.endsWith(")"))
      return [null, `&:${PSEUDO_FUCTIONS[i]}(${key.slice(PSEUDO_FUCTIONS[i].length + 1, -1)}) { ${value}}`];
  if (key === "initial") return [null, `@starting-style { ${value}}`];
  else if (key.startsWith("media(") && key.endsWith(")")) return [null, `@media ${key.slice(6, -1).trim()} { ${value}}`];
  return [null, `${key} { ${value}}`];
}

function formatValue(value, important = false) {
  value = value?.toString()?.trim() || "";
  if (value.endsWith("!")) ((important = true), (value = value.slice(0, -1)));
  let match = VALUE_REGEX.exec(value);
  while (match) {
    value = value.replace(match[0], `var(--${match[0].slice(1)})`);
    match = VALUE_REGEX.exec(value);
  }
  return important ? value + " !important" : value;
}

function uniqueString(count) {
  return (Math.imul(count ^ 0x9e3779b9, 0x85ebca6b) >>> 0).toString(36).padStart(6, "0").slice(-6);
}

function extractKeyValueFromString(str) {
  if (!str) return [];
  let key = null,
    val = null,
    ignore = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    if (str[i] === ")" && ignore > 0) ignore--;
    else if (str[i] === "(") ignore++;
    else if (ignore > 0) continue;
    else if (str[i] === ":") key = str.slice(0, i);
    else if (str[i] === ";") {
      if (key) val = str.slice(key.length + 1, i);
      else key = str.slice(0, i);
      return [key.trim(), val?.trim(), str.slice(i + 1)];
    }
  }
  if (key && !val) val = str.slice(key.length + 1);
  else if (!key) key = str;
  return [key?.trim(), val?.trim()];
}

// Utility

export function assignStyle(target, ...sources) {
  return Object.assign(ensureObject(target), ...sources.map(ensureObject));
}

function stringStyleToObjectStyle(value) {
  const obj = {};
  let [key, val, rest] = extractKeyValueFromString(value);
  while (key) {
    if (val?.startsWith("(") && val?.endsWith(")")) obj[key] = stringStyleToObjectStyle(val.slice(1, -1));
    else if (val !== false) obj[key] = val ?? true;
    [key, val, rest] = extractKeyValueFromString(rest);
  }
  return obj;
}

function ensureObject(value) {
  const typeofValue = typeof value;
  if (typeofValue === "object") {
    if (!Array.isArray(value)) return value;
    return Object.assign({}, ...value.map(ensureObject));
  } else if (typeofValue === "string") return stringStyleToObjectStyle(value);
  return {};
}
