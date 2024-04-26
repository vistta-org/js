type NavigateOptions = {
  href?: string;
  pushState?: boolean;
  refresh?: boolean;
  callback?: () => void;
};

interface Route {
  navigate: (href: string | NavigateOptions) => void;
  refresh: () => void;
  emit: (event: string, details?: any) => void;
  on: (event: string, callback: (event: any) => void) => void;
  location: Location;
}

export const route: Route;
export default route;
