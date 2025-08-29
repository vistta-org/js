import { load as loadJSX } from "./jsx.js";

const htmlToJSX = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
};

export async function load(source) {
  source = source.match(/(?<=(<template>)).*(?=(<\/template>))/gs)?.[0];
  if (!source)
    return {
      code: `export default () => null;`,
    };
  const keys = Object.keys(htmlToJSX);
  for (let i = 0, len = keys.length; i < len; i++)
    source = source.replace(new RegExp(`(?<=<[^>]*)${keys[i]}(?==)`, "g"), htmlToJSX[keys[i]]);
  source = source.replace(/(\r\n|\n|\r)/gm, "");
  source = source.replace(/<!--[\s\S]*?-->/gm, "");
  source = source.replace(/="{[^}]*}"/gm, (m) => "=" + m.slice(2, -1));
  const props = new Set();
  const matches = source.match(/(?<=[^{])\{(?=[^{}]*\})(?=[^"]*(?:"[^"]*"[^"]*)*$)[^}\s]*(?=[^{}]*\})\}/g);
  for (let i = 0, len = matches.length; i < len; i++) props.add(matches[i].slice(1, -1));
  return loadJSX(`export default ({ ${Array.from(props).join(", ")} }) => (<>${source.trim()}</>);`, { extension: "jsx" });
}
