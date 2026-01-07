import type { ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from '@tanstack/react-router';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Main layout component for the admin platform.
 * Navigation is minimal - max 6 primary items per design system rules.
 * Items auto-hide based on disabled features.
 */
export function Layout({ children }: LayoutProps) {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-xl text-primary-700">Everbloom</span>
          </Link>
          <nav className="flex items-center gap-6">
            {!isLoading && isAuthenticated && user && (
              <>
                <span className="text-sm text-neutral-500">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-neutral-600 hover:text-neutral-800"
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-neutral-200 py-4 text-center text-sm text-neutral-500">
        <p>Everbloom Wedding Platform</p>
      </footer>
    </div>
  );
}
