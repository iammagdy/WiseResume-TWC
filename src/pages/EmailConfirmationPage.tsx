import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MiniSpinner } from '@/components/ui/MiniSpinner';

/**
 * Legacy page — Supabase email confirmation is no longer used.
 * Redirects to /auth.
 */
export default function EmailConfirmationPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/auth', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <MiniSpinner size={32} />
    </div>
  );
}
