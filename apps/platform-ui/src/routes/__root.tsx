import {
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Layout } from '../components/Layout';
import { Dashboard } from '../components/Dashboard';
import { Login } from '../components/Login';
import { AuthCallback } from '../components/AuthCallback';
import { BillingSuccess } from '../components/BillingSuccess';
import { BillingCancel } from '../components/BillingCancel';

/**
 * Check if user is authenticated via Supabase Auth.
 * Note: This is a synchronous check that reads from Supabase's localStorage cache.
 * The actual session validation happens asynchronously in the AuthProvider.
 */
function isAuthenticated(): boolean {
  // Check Supabase's localStorage for session
  const storageKey = `sb-${import.meta.env.VITE_SUPABASE_URL?.replace(/https?:\/\//, '').split('.')[0]}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);

  if (!storedSession) {
    return false;
  }

  try {
    const session = JSON.parse(storedSession);
    // Check if session exists and isn't expired
    if (session?.expires_at) {
      return Date.now() < session.expires_at * 1000;
    }
    return !!session?.access_token;
  } catch {
    return false;
  }
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

// Auth callback route (handles Supabase magic link)
const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallback,
});

// Billing success route (protected)
const billingSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/success',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: BillingSuccess,
});

// Billing cancel route (protected)
const billingCancelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing/cancel',
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
  },
  component: BillingCancel,
});

// Export route tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authCallbackRoute,
  billingSuccessRoute,
  billingCancelRoute,
]);
