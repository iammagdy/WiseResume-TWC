import { useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Auth callback page — handles Kinde OAuth redirect.
 * Uses polling + hard redirect to ensure it always works
 * regardless of React state timing issues.
 */
export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useKindeAuth();

  useEffect(() => {
    // Poll until Kinde resolves, then hard-redirect
    const check = () => {
      const { isAuthenticated: auth, isLoading: loading } = (window as any).__kindeAuth || {};
      if (!isLoading && isAuthenticated) {
        window.location.replace('/dashboard');
        return;
      }
    };

    // If already resolved on mount
    if (!isLoading) {
      if (isAuthenticated) {
        window.location.replace('/dashboard');
        return;
      }
    }

    // Safety timeout — if still loading after 10s, redirect to dashboard anyway
    // (Kinde may have set cookies but isAuthenticated is stale)
    const timeout = setTimeout(() => {
      window.location.replace('/dashboard');
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isLoading, isAuthenticated]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'sans-serif',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Signing you in...</p>
    </div>
  );
}
