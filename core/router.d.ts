interface Route {
  navigate: () => void;
  emit: (event: string, details?: any) => void;
  on: (event: string, callback: (event: any) => void) => void;
  location: Location;
}

export function useRoute(): Route;
