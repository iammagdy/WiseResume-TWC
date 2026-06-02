import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard immediately - Appwrite handles its own state
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return <PageLoadingSpinner />;
}
