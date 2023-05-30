/// <reference path="./jsx.d.ts" />

// CSS
declare module "*.css" {
  function StyleComponent(props: { children?: JSX.Node }): JSX.Node;
  export default StyleComponent;
}

declare module "*.sass" {
  function StyleComponent(props: { children?: JSX.Node }): JSX.Node;
  export default StyleComponent;
}

declare module "*.scss" {
  function StyleComponent(props: { children?: JSX.Node }): JSX.Node;
  export default StyleComponent;
}

// Template
declare module "*.html" {
  function TemplateComponent(props: { [key: string]: any }): JSX.Node;
  export default TemplateComponent;
}

// Files
declare module "*.jpg" {
  const path: string;
  export default path;
}

declare module "*.png" {
  const path: string;
  export default path;
}

declare module "*.ico" {
  const path: string;
  export default path;
}
