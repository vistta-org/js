export function useContext<T = any>(key?: string): T;

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

type Callback = () => void;
export function useEffect(callback: () => void | Callback, dependencies?: any[], runOnRender?: boolean): void;

export function useForm(): void;
