import JSXLoader from "./jsx.js";

export default class TemplateLoader extends JSXLoader {
  async load(source) {
    source = source.match(/(?<=(<template>)).*(?=(<\/template>))/gs)?.[0];
    if (!source)
      return {
        code: `export default () => null;`,
        errors: null,
      };
    source = source.replace(/(\r\n|\n|\r)/gm, "");
    source = source.replace(/<!--[\s\S]*?-->/gm, "");
    source = source.replace(/="{[^}]*}"/gm, (m) => "=" + m.slice(2, -1));
    const props = new Set();
    const matches = source.match(/(?<=[^{])\{(?=[^{}]*\})(?=[^"]*(?:"[^"]*"[^"]*)*$)[^}\s]*(?=[^{}]*\})\}/g);
    for (let i = 0, len = matches.length; i < len; i++) props.add(matches[i].slice(1, -1));
    return super.load(`export default ({ ${Array.from(props).join(", ")} }) => (<>${source.trim()}</>);`, {
      extension: "jsx",
    });
  }
}
