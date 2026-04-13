import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

const INVITE_CODE_KEY = 'wr-invite-ref';

export default function InviteRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem(INVITE_CODE_KEY, code);
    }
    const target = code ? `/auth?ref=${encodeURIComponent(code)}` : '/auth';
    navigate(target, { replace: true });
  }, [code, navigate]);

  return <PageLoadingSpinner />;
}
