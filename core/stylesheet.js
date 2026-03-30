import { BoundClass, join } from "@vistta/utils";
/**
 * Style definition object ruke.
 * @typedef {Object<string, any>} StyleDefinition
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
  "starting-style": "@starting-style",
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

const VALUE_REGEX = /\$[^,){}\s]+/g;

/**
 * @typedef {Object} StyleFormatOptions
 * @property {any} [properties]
 * @property {any} [queries]
 * @property {any} [functions]
 * @property {boolean} [selector]
 * @property {(value: string) => string} [createAnimation]
 */

export class VirtualStyleSheet extends BoundClass {
  #instance;
  #styleGroups = {};
  #count = 0;
  #animations = {};
  #properties = {};
  #queries = {};
  #functions = [];

  get rules() {
    return this.#instance.cssRules;
  }

  get content() {
    return this.#instance;
  }

  constructor() {
    super();
    this.#instance = new CSSStyleSheet();
  }

  add(style) {
    const { properties = {}, queries = {}, functions = {}, vars = {}, fonts = {}, animations = {}, ...selectors } = style;
    let keys = Object.keys(properties);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (typeof properties[keys[i]] !== "object") continue;
      const values = Object.keys(properties[keys[i]]);
      const styleValues = {};
      for (let j = 0, vlen = values.length; j < vlen; j++) {
        const value = properties[keys[i]][values[j]];
        const typeofValue = typeof value;
        if (typeofValue === "string")
          styleValues[values[j]] = stringToStyle(value, { createAnimation: (value) => this.createAnimation(value) });
        else if (typeofValue === "object") {
          if (Array.isArray(value))
            styleValues[values[j]] = stringToStyle(join(value, "; "), {
              createAnimation: (value) => this.createAnimation(value),
            });
          else styleValues[values[j]] = objectToStyle(value, { createAnimation: (value) => this.createAnimation(value) });
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

    keys = Object.keys(functions);
    for (let i = 0, len = keys.length; i < len; i++) {
      if (typeof functions[keys[i]] !== "string") continue;
      this.#functions.push({ regex: new RegExp(keys[i] + "\\(([^)]+)\\)", "g"), template: functions[keys[i]] });
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
      this.#insertRule(
        `@keyframes ${animation} { ${objectToStyle(value, {
          properties: this.#properties,
          queries: this.#queries,
          functions: this.#functions,
        })} }`,
      );
    }

    keys = Object.keys(selectors);
    for (let i = keys.length - 1; i >= 0; i--) {
      const value = selectors[keys[i]];
      const typeofValue = typeof value;
      if (keys[i] === "root") keys[i] = ":root";
      else if (/[{}]/.test(keys[i])) continue;
      if (typeofValue === "string" || typeofValue === "number")
        this.#insertRule(
          `${keys[i]} { ${stringToStyle(value, {
            properties: this.#properties,
            queries: this.#queries,
            functions: this.#functions,
            createAnimation: (value) => this.createAnimation(value),
          })} }`,
        );
      else if (typeofValue === "object") {
        if (Array.isArray(value))
          this.#insertRule(
            `${keys[i]} { ${stringToStyle(join(value, "; "), {
              properties: this.#properties,
              queries: this.#queries,
              functions: this.#functions,
              createAnimation: (value) => this.createAnimation(value),
            })} }`,
          );
        else
          this.#insertRule(
            `${keys[i]} { ${objectToStyle(value, {
              properties: this.#properties,
              queries: this.#queries,
              functions: this.#functions,
              createAnimation: (value) => this.createAnimation(value),
            })} }`,
          );
      }
    }
  }

  resolve(value) {
    let style;
    const typeofValue = typeof value;
    if (typeofValue === "string")
      style = stringToStyle(value, {
        properties: this.#properties,
        queries: this.#queries,
        functions: this.#functions,
        createAnimation: (value) => this.createAnimation(value),
      });
    else if (typeofValue === "object") {
      if (Array.isArray(value))
        style = stringToStyle(join(value, "; "), {
          properties: this.#properties,
          queries: this.#queries,
          functions: this.#functions,
          createAnimation: (value) => this.createAnimation(value),
        });
      else
        style = objectToStyle(value, {
          properties: this.#properties,
          queries: this.#queries,
          functions: this.#functions,
          createAnimation: (value) => this.createAnimation(value),
        });
    } else return "";
    if (!style) return "";
    if (this.#styleGroups[style]) return this.#styleGroups[style];
    const id = (this.#styleGroups[style] = this.#count++);
    this.#insertRule(`[style-group="${id}"] { ${style}}`);
    return id;
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

function stringToStyle(value, options = /** @type {StyleFormatOptions} */ ({})) {
  let style = "";
  let [key, val, rest] = extractKeyValueFromString(value);
  while (key) {
    if (val?.startsWith("(") && val?.endsWith(")"))
      style += format(key, stringToStyle(val.slice(1, -1), options), { ...options, selector: true }) + " ";
    else style += format(key, val ?? "default", { ...options, selector: false }) + " ";
    [key, val, rest] = extractKeyValueFromString(rest);
  }
  return style;
}

function objectToStyle(value, options = /** @type {StyleFormatOptions} */ ({})) {
  const { properties, queries, functions, createAnimation } = options;
  let style = "";
  const keys = Object.keys(value);
  for (let i = 0, len = keys.length; i < len; i++) {
    let key = keys[i];
    let cur = value[key];
    const typeofValue = typeof cur;
    if (typeofValue === "string" || typeofValue === "number")
      style += format(key, cur, { properties, queries, functions, selector: false, createAnimation }) + " ";
    else if (typeofValue === "boolean" && cur === true)
      style += format(key, "default", { properties, queries, functions, selector: false, createAnimation }) + " ";
    else if (typeofValue === "object") {
      if (Array.isArray(cur))
        style += format(key, join(cur, " "), { properties, queries, functions, selector: false, createAnimation }) + " ";
      else
        style +=
          format(key, objectToStyle(cur, { properties, queries, functions, createAnimation }), {
            properties,
            queries,
            functions,
            selector: true,
            createAnimation,
          }) + " ";
    }
  }
  return style;
}

function format(key, value, options = /** @type {StyleFormatOptions} */ ({})) {
  const { properties = {}, queries = {}, functions = [], selector, createAnimation } = options;
  key = camelToKebab(key);
  if (!selector) {
    if (properties[key]) return properties[key](formatValue(value, false, functions));
    return `${key.startsWith("$") ? "--" + key.slice(1) : key}:${formatValue(value, false, functions)};`;
  }
  if (key === "animation") return createAnimation ? createAnimation(value) : "";
  if (queries[key]) return queries[key](value) + " ";
  if (PSEUDO_CLASSES[key]) return `${PSEUDO_CLASSES[key]} { ${value}}`;
  for (let i = 0, len = PSEUDO_FUCTIONS.length; i < len; i++)
    if (key.startsWith(PSEUDO_FUCTIONS[i] + "(") && key.endsWith(")"))
      return `&:${PSEUDO_FUCTIONS[i]}(${key.slice(PSEUDO_FUCTIONS[i].length + 1, -1)}) { ${value}}`;
  if (key === "initial") return `@starting-style { ${value}}`;
  else if (key.startsWith("media(") && key.endsWith(")")) return `@media ${key.slice(6, -1).trim()} { ${value}}`;
  return `${key} { ${value}}`;
}

function formatValue(value, important = false, functions = []) {
  value = value?.toString()?.trim() || "";
  if (value.endsWith("!")) ((important = true), (value = value.slice(0, -1)));
  for (let i = 0, len = functions.length; i < len; i++) {
    const { regex, template } = functions[i];
    value = value.replaceAll(regex, (_, args) => {
      const parts = args.split(",").map((a) => a.trim());
      return template.replace(/\$\{(\d+)(?::([^}]*))?\}/g, (_, n, def) => parts[n - 1] ?? def ?? "");
    });
  }
  value = value.replaceAll(VALUE_REGEX, (match) => `var(--${match.slice(1)})`);
  return important ? value + " !important" : value;
}

function extractKeyValueFromString(str) {
  if (!str) return [];
  let key = null,
    val = null,
    ignore = 0,
    quote = null;
  for (let i = 0, len = str.length; i < len; i++) {
    if (quote) {
      if (str[i] === quote && str[i - 1] !== "\\") quote = null;
      continue;
    }
    if (str[i] === '"' || str[i] === "'") {
      quote = str[i];
      continue;
    }
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

export class Style {
  /**
   *
   * @param {object | string | string[]} target
   * @param  {...(object | string | string[])} sources
   * @returns {object}
   */
  static assign(target, ...sources) {
    return Object.assign(ensureObject(target), ...sources.map(ensureObject));
  }
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

function camelToKebab(str) {
  return str.replace(/[A-Z]+/g, (match, offset) => (offset ? "-" : "") + match.toLowerCase());
}
