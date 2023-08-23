export function useContext<T = any>(key: string): T;

export function useStyle(...styles: JSX.Style[]): JSX.Component | { scope: string };

interface Ref<T> {
  current?: T;
}
export function useRef<T = any>(initialValue?: T): Ref<T>;

interface State<T> {
  set: (value: T) => void;
  valueOf: () => T;
  toString: () => string;
}
export function useState<T = any>(initialValue: T): State<T>;

interface Effect<T> extends State<T> {
  readonly value: T;
}
export function useEffect<T>(callback: () => void | T, dependencies?: any[], runOnRender?: boolean): Effect<T>;
