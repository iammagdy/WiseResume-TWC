import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Auth callback page — handles Kinde OAuth redirect.
 * After Kinde processes the code, redirects to /dashboard.
 * Falls back to hard-redirect after 8s to avoid infinite loading.
 */
export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    // Already authenticated — go straight to dashboard
    if (!isLoading && isAuthenticated) {
      window.location.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated]);

  // Safety net: if Kinde never resolves, redirect after 8s.
  // Send to dashboard only if authenticated, otherwise back to login.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        window.location.replace('/dashboard');
      } else {
        window.location.replace('/auth?mode=login');
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'sans-serif',
      gap: '16px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <p style={{ margin: 0, opacity: 0.6, fontSize: '14px' }}>Signing you in…</p>
    </div>
  );
}
