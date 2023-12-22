import script from "./script.js";

const htmlToJSX = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  frameborder: "frameBorder",
  allowfullscreen: "allowFullScreen",
};

export default async function (source) {
  source = source.match(/(?<=(<template>)).*(?=(<\/template>))/gs)?.[0];
  if (!source) return {
    code: `export default () => null;`,
  };
  Object.keys(htmlToJSX).forEach((key) => {
    source = source.replace(new RegExp(`(?<=<[^>]*)${key}(?==)`, "g"), htmlToJSX[key]);
  });
  source = source.replace(/(\r\n|\n|\r)/gm, "");
  source = source.replace(/<!--[\s\S]*?-->/gm, "");
  source = source.replace(/="{[^}]*}"/gm, (m) => "=" + m.slice(2, -1));
  const props = new Set();
  source
    .match(/(?<=[^{])\{(?=[^{}]*\})(?=[^"]*(?:"[^"]*"[^"]*)*$)[^}\s]*(?=[^{}]*\})\}/g)
    .forEach((match) => props.add(match.slice(1, -1)));
  return script(
    `export default ({ ${Array.from(props).join(
      ", ",
    )} }) => (<>${source.trim()}</>);`,
    { extension: "jsx" },
  );
}
