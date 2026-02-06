/**
 * Centralized navigation utilities for consistent back navigation across the app.
 * 
 * This replaces unreliable window.history.length checks with explicit route mapping,
 * which is essential for Capacitor WebViews and deep-linked sessions.
 */

/** Explicit parent route mapping for back navigation */
const BACK_ROUTES: Record<string, string> = {
  '/editor': '/dashboard',
  '/preview': '/editor',
  '/upload': '/dashboard',
  '/interview': '/dashboard',
  '/settings': '/dashboard',
  '/auth': '/',
};

/**
 * Get the appropriate back route for a given pathname.
 * For authenticated users on certain screens, returns dashboard.
 * For guests on editor, returns landing page.
 * 
 * @param pathname - Current route pathname
 * @param isAuthenticated - Whether the user is logged in
 * @returns The route to navigate back to
 */
export function getBackRoute(pathname: string, isAuthenticated: boolean = true): string {
  // Guest users on editor should go back to landing page
  if (pathname === '/editor' && !isAuthenticated) {
    return '/';
  }
  
  // Check for exact match first
  if (BACK_ROUTES[pathname]) {
    return BACK_ROUTES[pathname];
  }
  
  // Handle dynamic routes (e.g., /editor/123)
  for (const [route, backRoute] of Object.entries(BACK_ROUTES)) {
    if (pathname.startsWith(route + '/')) {
      return backRoute;
    }
  }
  
  // Default fallback
  return '/dashboard';
}

/**
 * Routes where pressing hardware back should exit the app
 */
export const EXIT_ROUTES = ['/', '/dashboard'];

/**
 * Check if the current route should exit the app on back press
 */
export function shouldExitOnBack(pathname: string): boolean {
  return EXIT_ROUTES.includes(pathname);
}
