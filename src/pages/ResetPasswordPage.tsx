import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

/**
 * Trampoline: redirects /reset-password?token_hash=...&type=recovery
 * to /auth?mode=reset&token_hash=...&type=recovery so the flow works
 * even when the custom domain doesn't support SPA fallback.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = `/auth?mode=reset&${params.toString()}`;
    navigate(target, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <MiniSpinner size={32} />
    </div>
  );
}
