import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner';

const SEARCH_PREFILL_KEY = 'wr-search-prefill';
const SEARCH_OPEN_INTENT_KEY = 'wr-search-open';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q) {
      sessionStorage.setItem(SEARCH_PREFILL_KEY, q);
    }
    sessionStorage.setItem(SEARCH_OPEN_INTENT_KEY, '1');
    navigate('/dashboard', { replace: true });
    window.dispatchEvent(new Event('open-command-palette'));
  }, [navigate, searchParams]);

  return <PageLoadingSpinner />;
}
