import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

export default function InviteRedirectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Preserve old shared URLs without implying an active referral-reward system.
    navigate('/auth', { replace: true });
  }, [navigate]);

  return <PageLoadingSpinner />;
}
