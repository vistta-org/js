declare function _Element<Props extends { [name: string]: any }>(
  id: string | number,
  type: string | JSX.Component<Props>,
  props?: Props,
  children?: JSX.Node[],
): JSX.Element | null;
declare const _Fragment: symbol;
declare const React: object;

interface Element {
  key?: string;
  ref?: any;
  instance?: any;
  scope?: string;
}

interface Event {
  strictMode: () => void;
}

interface SubmitEvent {
  values?: { [name: string]: any };
}

interface EventHandlers {
  onabort: GlobalEventHandlers["onabort"];
  onAbort: GlobalEventHandlers["onabort"];
  onanimationcancel: GlobalEventHandlers["onanimationcancel"];
  onAnimationCancel: GlobalEventHandlers["onanimationcancel"];
  onanimationend: GlobalEventHandlers["onanimationend"];
  onAnimationEnd: GlobalEventHandlers["onanimationend"];
  onanimationiteration: GlobalEventHandlers["onanimationiteration"];
  onAnimationIteration: GlobalEventHandlers["onanimationiteration"];
  onanimationstart: GlobalEventHandlers["onanimationstart"];
  onAnimationStart: GlobalEventHandlers["onanimationstart"];
  onauxclick: GlobalEventHandlers["onauxclick"];
  onAuxClick: GlobalEventHandlers["onauxclick"];
  onblur: GlobalEventHandlers["onblur"];
  onBlur: GlobalEventHandlers["onblur"];
  oncancel: GlobalEventHandlers["oncancel"];
  onCancel: GlobalEventHandlers["oncancel"];
  oncanplay: GlobalEventHandlers["oncanplay"];
  onCanPlay: GlobalEventHandlers["oncanplay"];
  oncanplaythrough: GlobalEventHandlers["oncanplaythrough"];
  onCanPlayThrough: GlobalEventHandlers["oncanplaythrough"];
  onchange: GlobalEventHandlers["onchange"];
  onChange: GlobalEventHandlers["onchange"];
  onclick: GlobalEventHandlers["onclick"];
  onClick: GlobalEventHandlers["onclick"];
  onclose: GlobalEventHandlers["onclose"];
  onClose: GlobalEventHandlers["onclose"];
  oncontextmenu: GlobalEventHandlers["oncontextmenu"];
  onContextMenu: GlobalEventHandlers["oncontextmenu"];
  oncopy: GlobalEventHandlers["oncopy"];
  onCopy: GlobalEventHandlers["oncopy"];
  oncuechange: GlobalEventHandlers["oncuechange"];
  onCueChange: GlobalEventHandlers["oncuechange"];
  oncut: GlobalEventHandlers["oncut"];
  onCut: GlobalEventHandlers["oncut"];
  ondblclick: GlobalEventHandlers["ondblclick"];
  onDblClick: GlobalEventHandlers["ondblclick"];
  ondrag: GlobalEventHandlers["ondrag"];
  onDrag: GlobalEventHandlers["ondrag"];
  ondragenter: GlobalEventHandlers["ondragenter"];
  onDragEnter: GlobalEventHandlers["ondragenter"];
  ondragleave: GlobalEventHandlers["ondragleave"];
  onDragLeave: GlobalEventHandlers["ondragleave"];
  ondragover: GlobalEventHandlers["ondragover"];
  onDragOver: GlobalEventHandlers["ondragover"];
  ondragstart: GlobalEventHandlers["ondragstart"];
  onDragStart: GlobalEventHandlers["ondragstart"];
  ondrop: GlobalEventHandlers["ondrop"];
  onDrop: GlobalEventHandlers["ondrop"];
  ondurationchange: GlobalEventHandlers["ondurationchange"];
  onDurationChange: GlobalEventHandlers["ondurationchange"];
  onemptied: GlobalEventHandlers["onemptied"];
  onEmptied: GlobalEventHandlers["onemptied"];
  onended: GlobalEventHandlers["onended"];
  onEnded: GlobalEventHandlers["onended"];
  onerror: OnErrorEventHandler;
  onError: OnErrorEventHandler;
  onfocus: GlobalEventHandlers["onfocus"];
  onFocus: GlobalEventHandlers["onfocus"];
  onformdata: GlobalEventHandlers["onformdata"];
  onFormData: GlobalEventHandlers["onformdata"];
  ongotpointercapture: GlobalEventHandlers["ongotpointercapture"];
  onGotPointerCapture: GlobalEventHandlers["ongotpointercapture"];
  oninput: GlobalEventHandlers["oninput"];
  onInput: GlobalEventHandlers["oninput"];
  oninvalid: GlobalEventHandlers["oninvalid"];
  onInvalid: GlobalEventHandlers["oninvalid"];
  onkeydown: GlobalEventHandlers["onkeydown"];
  onKeyDown: GlobalEventHandlers["onkeydown"];
  onkeyup: GlobalEventHandlers["onkeyup"];
  onKeyUp: GlobalEventHandlers["onkeyup"];
  onload: GlobalEventHandlers["onload"];
  onLoad: GlobalEventHandlers["onload"];
  onloadeddata: GlobalEventHandlers["onloadeddata"];
  onLoadedData: GlobalEventHandlers["onloadeddata"];
  onloadedmetadata: GlobalEventHandlers["onloadedmetadata"];
  onLoadedMetadata: GlobalEventHandlers["onloadedmetadata"];
  onloadstart: GlobalEventHandlers["onloadstart"];
  onLoadStart: GlobalEventHandlers["onloadstart"];
  onlostpointercapture: GlobalEventHandlers["onlostpointercapture"];
  onLostPointerCapture: GlobalEventHandlers["onlostpointercapture"];
  onmousedown: GlobalEventHandlers["onmousedown"];
  onMouseDown: GlobalEventHandlers["onmousedown"];
  onmouseenter: GlobalEventHandlers["onmouseenter"];
  onMouseEnter: GlobalEventHandlers["onmouseenter"];
  onmouseleave: GlobalEventHandlers["onmouseleave"];
  onMouseLeave: GlobalEventHandlers["onmouseleave"];
  onmousemove: GlobalEventHandlers["onmousemove"];
  onMouseMove: GlobalEventHandlers["onmousemove"];
  onmouseout: GlobalEventHandlers["onmouseout"];
  onMouseOut: GlobalEventHandlers["onmouseout"];
  onmouseover: GlobalEventHandlers["onmouseover"];
  onMouseOver: GlobalEventHandlers["onmouseover"];
  onmouseup: GlobalEventHandlers["onmouseup"];
  onMouseUp: GlobalEventHandlers["onmouseup"];
  onpaste: GlobalEventHandlers["onpaste"];
  onPaste: GlobalEventHandlers["onpaste"];
  onpause: GlobalEventHandlers["onpause"];
  onPause: GlobalEventHandlers["onpause"];
  onplay: GlobalEventHandlers["onplay"];
  onPlay: GlobalEventHandlers["onplay"];
  onplaying: GlobalEventHandlers["onplaying"];
  onPlaying: GlobalEventHandlers["onplaying"];
  onpointercancel: GlobalEventHandlers["onpointercancel"];
  onPointerCancel: GlobalEventHandlers["onpointercancel"];
  onpointerdown: GlobalEventHandlers["onpointerdown"];
  onPointerDown: GlobalEventHandlers["onpointerdown"];
  onpointerenter: GlobalEventHandlers["onpointerenter"];
  onPointerEnter: GlobalEventHandlers["onpointerenter"];
  onpointerleave: GlobalEventHandlers["onpointerleave"];
  onPointerLeave: GlobalEventHandlers["onpointerleave"];
  onpointermove: GlobalEventHandlers["onpointermove"];
  onPointerMove: GlobalEventHandlers["onpointermove"];
  onpointerout: GlobalEventHandlers["onpointerout"];
  onPointerOut: GlobalEventHandlers["onpointerout"];
  onpointerover: GlobalEventHandlers["onpointerover"];
  onPointerOver: GlobalEventHandlers["onpointerover"];
  onpointerup: GlobalEventHandlers["onpointerup"];
  onPointerUp: GlobalEventHandlers["onpointerup"];
  onprogress: GlobalEventHandlers["onprogress"];
  onProgress: GlobalEventHandlers["onprogress"];
  onratechange: GlobalEventHandlers["onratechange"];
  onRateChange: GlobalEventHandlers["onratechange"];
  onreset: GlobalEventHandlers["onreset"];
  onReset: GlobalEventHandlers["onreset"];
  onresize: GlobalEventHandlers["onresize"];
  onResize: GlobalEventHandlers["onresize"];
  onscroll: GlobalEventHandlers["onscroll"];
  onScroll: GlobalEventHandlers["onscroll"];
  onscrollend: GlobalEventHandlers["onscrollend"];
  onScrollEnd: GlobalEventHandlers["onscrollend"];
  onsecuritypolicyviolation: GlobalEventHandlers["onsecuritypolicyviolation"];
  onSecurityPolicyViolation: GlobalEventHandlers["onsecuritypolicyviolation"];
  onseeked: GlobalEventHandlers["onseeked"];
  onSeeked: GlobalEventHandlers["onseeked"];
  onseeking: GlobalEventHandlers["onseeking"];
  onSeeking: GlobalEventHandlers["onseeking"];
  onselect: GlobalEventHandlers["onselect"];
  onSelect: GlobalEventHandlers["onselect"];
  onselectionchange: GlobalEventHandlers["onselectionchange"];
  onSelectionChange: GlobalEventHandlers["onselectionchange"];
  onselectstart: GlobalEventHandlers["onselectstart"];
  onSelectStart: GlobalEventHandlers["onselectstart"];
  onslotchange: GlobalEventHandlers["onslotchange"];
  onSlotChange: GlobalEventHandlers["onslotchange"];
  onstalled: GlobalEventHandlers["onstalled"];
  onStalled: GlobalEventHandlers["onstalled"];
  onsubmit: GlobalEventHandlers["onsubmit"];
  onSubmit: GlobalEventHandlers["onsubmit"];
  onsuspend: GlobalEventHandlers["onsuspend"];
  onSuspend: GlobalEventHandlers["onsuspend"];
  ontimeupdate: GlobalEventHandlers["ontimeupdate"];
  onTimeUpdate: GlobalEventHandlers["ontimeupdate"];
  ontoggle: GlobalEventHandlers["ontoggle"];
  onToggle: GlobalEventHandlers["ontoggle"];
  ontouchcancel?: GlobalEventHandlers["ontouchcancel"];
  onTouchCancel?: GlobalEventHandlers["ontouchcancel"];
  ontouchend?: GlobalEventHandlers["ontouchend"];
  onTouchEnd?: GlobalEventHandlers["ontouchend"];
  ontouchmove?: GlobalEventHandlers["ontouchmove"];
  onTouchMove?: GlobalEventHandlers["ontouchmove"];
  ontouchstart?: GlobalEventHandlers["ontouchstart"];
  onTouchStart?: GlobalEventHandlers["ontouchstart"];
  ontransitioncancel: GlobalEventHandlers["ontransitioncancel"];
  onTransitionCancel: GlobalEventHandlers["ontransitioncancel"];
  ontransitionend: GlobalEventHandlers["ontransitionend"];
  onTransitionEnd: GlobalEventHandlers["ontransitionend"];
  ontransitionrun: GlobalEventHandlers["ontransitionrun"];
  onTransitionRun: GlobalEventHandlers["ontransitionrun"];
  ontransitionstart: GlobalEventHandlers["ontransitionstart"];
  onTransitionStart: GlobalEventHandlers["ontransitionstart"];
  onvolumechange: GlobalEventHandlers["onvolumechange"];
  onVolumeChange: GlobalEventHandlers["onvolumechange"];
  onwaiting: GlobalEventHandlers["onwaiting"];
  onWaiting: GlobalEventHandlers["onwaiting"];
  onwheel: GlobalEventHandlers["onwheel"];
  onWheel: GlobalEventHandlers["onwheel"];
}

interface CustomElement {
  style?: JSX.Style;
  validator: (target?: Element) => string | boolean;
  [key: string]: any;
}

interface HTMLElement {
  class?: string;
  for?: string;
  readonly?: boolean;
  tabindex?: number;
  frameborder?: number | string;
  allowfullscreen?: boolean;
  allowpaymentrequest?: boolean;
  allowtransparency?: boolean;
}

declare type BaseHTMLProps<E extends HTMLElement | SVGElement> = Partial<
  Omit<
    {
      [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K];
    },
    "style" | "contentEditable"
  > & {
    style?: JSX.Style;
    contentEditable?: boolean;
  } & EventHandlers &
    CustomElement
>;

declare type HTMLProps<E extends HTMLElement | SVGElement> = BaseHTMLProps<E> & JSX.Namespaced<BaseHTMLProps<E>>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;

  type InputProps = Omit<HTMLProps<HTMLInputElement>, "value"> & {
    value?: string | number;
  };

  type TextareaProps = Omit<HTMLProps<HTMLTextAreaElement>, "value"> & {
    value?: string | number;
  };

  type ButtonProps = Omit<HTMLProps<HTMLButtonElement>, "type"> & {
    type?: "button" | "reset" | "submit" | {};
  };

  class Component<T extends Record<string, any> = {}> {
    constructor(props?: T);
    props(exclude?: string[]): Partial<T & Record<string, any>>;
  }

  type Style = string | number | boolean | null | undefined | Style[] | StyleObject;

  type StyleObject = { [key: string]: Style };

  type BaseIntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HTMLProps<HTMLElementTagNameMap[K]>;
  };

  type IntrinsicElementMap = Omit<BaseIntrinsicElementMap, "input" | "textarea" | "button"> & {
    input: InputProps;
    textarea: TextareaProps;
    button: ButtonProps;
  };

  interface IntrinsicElements extends IntrinsicElementMap {}

  type LibraryManagedAttributes<C, _> = C extends new (props?: infer P, ...args: any[]) => any
    ? Partial<P> & { children?: any } & Namespaced<P>
    : never;

  type ObjectProp<T> = Exclude<NonNullable<T>, string | number | boolean | bigint | symbol | Function | readonly any[]>;

  // Index signatures would collapse `keyof` into `string` and hide the declared props.
  type KnownKeys<P> = keyof { [K in keyof P as string extends K ? never : number extends K ? never : K]: 0 } & string;

  type IsObject<T> = [ObjectProp<T>] extends [never] ? false : true;

  // `onClick` -> `on:click`; object props `style` -> `style:${key}` for declared keys.
  type NamespacedKeys<P> = {
    [K in KnownKeys<P>]: K extends `on${infer E}`
      ? E extends Capitalize<E>
        ? E extends ""
          ? never
          : `on:${Uncapitalize<E>}`
        : IsObject<P[K]> extends true
          ? `${K}:${KnownKeys<ObjectProp<P[K]>>}`
          : never
      : IsObject<P[K]> extends true
        ? `${K}:${KnownKeys<ObjectProp<P[K]>>}`
        : never;
  }[KnownKeys<P>];

  // Kept apart from NamespacedKeys: a `style:${string}` pattern would absorb literal keys like `style:variant`.
  type NamespacedIndexKeys<P> = {
    [K in KnownKeys<P>]: K extends "on" | `on${Capitalize<string>}`
      ? never
      : IsObject<P[K]> extends true
        ? string extends keyof ObjectProp<P[K]>
          ? `${K}:${string}`
          : never
        : never;
  }[KnownKeys<P>];

  type NamespacedValue<P, N> = N extends `on:${infer E}`
    ? P[`on${Capitalize<E>}` & keyof P]
    : N extends `${infer K}:${infer S}`
      ? ObjectProp<P[K & keyof P]>[S & keyof ObjectProp<P[K & keyof P]>]
      : never;

  type Namespaced<P> = { [N in NamespacedKeys<P>]?: NamespacedValue<P, N> } & {
    [N in NamespacedIndexKeys<P>]?: NamespacedValue<P, N>;
  };

  interface IntrinsicAttributes {
    key?: string | number;
  }

  type EventHandlers = {
    [K in keyof globalThis.EventHandlers]?: globalThis.EventHandlers[K] extends ((this: any, ev: infer E) => any) | null
      ? (event: E) => any
      : never;
  };

  type ComponentProps<T> = Partial<Omit<T, "children">> & { children?: any };
}
