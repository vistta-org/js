// CSS
declare function StyleComponent(props: any): JSX.Element;

declare module "*.css" {
  export default StyleComponent;
}

declare module "*.sass" {
  export default StyleComponent;
}

declare module "*.scss" {
  export default StyleComponent;
}

// Template
declare function TemplateComponent(props: any): JSX.Element;

declare module "*.html" {
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

declare const React: typeof import("react");
