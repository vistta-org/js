interface Ref<T> {
  current?: T;
}
export function useRef<T = any>(initialValue?: T): Ref<T>;

interface State<T> {
  value: T;
}
export function useState<T = any>(initialValue: T): State<T>;

interface Effect<T> extends State<T> {
  readonly value: T;
}
export function useEffect<T>(callback: () => void | T, dependencies?: any[], runOnRender?: boolean): Effect<T>;
