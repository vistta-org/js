/// <reference path="./jsx.d.ts" />

// CSS
declare module "*.css" {
  const style: JSX.Style;
  export default style;
}

declare module "*.sass" {
  const style: JSX.Style;
  export default style;
}

declare module "*.scss" {
  const style: JSX.Style;
  export default style;
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
