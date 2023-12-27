
export const tag = (string) => {
  const tag = string.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
  if (tag.includes("-")) return tag.startsWith("-") ? "c" + tag : tag;
  return "c-" + tag;
};

export const trim = (string) => {
  if (typeof string !== "string") return string;
  string = string.trim();
  if (
    (string.charAt(0) === `"` && string.charAt(string.length - 1) === `"`) ||
    (string.charAt(0) === `'` && string.charAt(string.length - 1) === `'`)
  )
    string = string.slice(1, -1);
  return string;
};

export function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function indexOf(string, ...searchStrings) {
  let index = -1;
  for (let i = 0, len = searchStrings?.length || 0; i < len; i++) {
    const curr = string.indexOf(searchStrings[i]);
    if (index == -1 || (curr > 0 && curr < index)) index = curr;
    else if (curr == 0) return 0;
  }
  return index;
}

export function camelCaseToKebabCase(string) {
  return string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function convertToEventName(string) {
  if (typeof string !== "string") return null;
  string = string
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/-/g, "_");
  if (!/^[a-z][\w]*$/.test(string)) return null;
  return string;
}
