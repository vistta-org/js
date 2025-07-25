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
  style?: Partial<CSSStyleDeclaration>;
  validator: (target?: Element) => string | boolean;
}

interface HTMLElement {
  anchor?: string;
  readonly?: boolean;
}

declare type HTMLProps<E extends HTMLElement | SVGElement> = Partial<
  {
    [K in keyof E as E[K] extends Readonly<any> ? never : K]?: E[K];
  } & EventHandlers &
    CustomElement
>;

declare namespace JSX {
  type Element = {};
  type Node = Element | Element[] | null;

  class Component<T extends Record<string, any> = {}> {
    constructor(props?: T);
  }

  type Style = { scope: string };

  type IntrinsicElementMap = {
    [K in keyof HTMLElementTagNameMap]: HTMLProps<HTMLElementTagNameMap[K]>;
  };

  interface IntrinsicElements extends IntrinsicElementMap {
    [componentName: string]: any;
  }

  type LibraryManagedAttributes<C, _> = C extends new (...args: any[]) => infer Instance ? ComponentProps<Instance> : never;

  interface IntrinsicAttributes {
    key?: string | number;
  }

  type ComponentProps<T> = Pick<
    T,
    {
      [K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
    }[keyof T]
  > &
    Partial<
      Pick<
        T,
        {
          [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
        }[keyof T]
      >
    >;
}
