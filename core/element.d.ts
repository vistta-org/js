export function createElement(type: string, props: { [key: string]: any }, children: JSX.Node): JSX.Element;
export function cloneElement(
  element: JSX.Element,
  props?: { [key: string]: any },
  children?: boolean | JSX.Node,
): JSX.Element;
