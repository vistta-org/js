/// <reference types="node"/>
/// <reference path="./jsx.d.ts" />
/// <reference types="@vistta/cli/global" />

declare interface Document {
  mount(content: any, props?: Record<string, any>, config?: Record<string, any>): Promise<any>;
  wait(timeout: number): Promise<void>;
  querySelector(selectors: string): any;
}

declare interface HTMLElement {
  value: any;
  write(
    text: string,
    options?: { delay?: number; clear?: boolean; dispatchKeyboardEvents?: boolean },
  ): Promise<any>;
}

declare module "@socket" { export function io(...args: any[]): any; }

// CSS
declare module "*.css" {
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

declare module "*.ttf" {
  const path: string;
  export default path;
}


declare const IS_NODE: boolean;
