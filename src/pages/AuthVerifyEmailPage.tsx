import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

/**
 * Landing page for post-email-verification redirects from Kinde.
 *
 * - Authenticated users are immediately sent to /dashboard.
 * - Unauthenticated users see the success confirmation card and a CTA to
 *   sign in; the ProtectedRoute on /dashboard handles final auth gating.
 */
export default function AuthVerifyEmailPage() {
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
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Your email is verified</h1>
            <p className="text-sm text-muted-foreground">
              Your email address has been successfully verified. Continue to your dashboard to get started.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
