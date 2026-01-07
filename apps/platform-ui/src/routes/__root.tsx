import {
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Layout } from '../components/Layout';
import { Dashboard } from '../components/Dashboard';
import { Login } from '../components/Login';
import { VerifyMagicLink } from '../components/VerifyMagicLink';

// Check if user is authenticated (simple localStorage check)
// AuthProvider will handle the actual validation
function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token');
}

// Root route with layout
const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

// Index route - Dashboard (protected)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: Dashboard,
});

// Login route (public)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/' });
    }
  },
  component: Login,
});

// Auth verification route (handles magic link callback)
const authVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify',
  validateSearch: (search: Record<string, unknown>): { token?: string } => {
    return {
      token: typeof search.token === 'string' ? search.token : undefined,
    };
  },
  component: VerifyMagicLink,
});

// Export route tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authVerifyRoute,
]);
