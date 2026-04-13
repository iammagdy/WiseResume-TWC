import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

/**
 * Landing page for post-password-reset redirects from Kinde.
 *
 * Configure Kinde's "Post-password reset redirect URL" to point to
 * /auth/reset-password in the Kinde dashboard (Applications → Your App →
 * Authentication → Password reset → Redirect URL).
 *
 * - Authenticated users are immediately sent to /dashboard.
 * - Unauthenticated users (including direct navigators) see the success card
 *   with a "Sign In" CTA — a safe fallback that causes no harm.
 */
export default function AuthResetPasswordPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading) return null;

  return (
    <div className="relative isolate min-h-[100dvh] flex flex-col overflow-hidden bg-background">
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 px-8 py-10 rounded-2xl bg-card border border-border shadow-soft-lg max-w-sm w-full text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <ShieldCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Password reset successful</h1>
            <p className="text-sm text-muted-foreground">
              Your password has been reset. Sign in with your new password to continue.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => navigate('/auth?mode=login')}
          >
            Sign In
          </Button>
        </div>
      </div>
    </div>
  );
}
