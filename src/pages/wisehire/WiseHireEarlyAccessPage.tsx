import { useLayoutEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

import { removeSensitiveParamsFromCurrentAddressBar } from '@/lib/security/sensitiveUrlSanitizer';
import { rememberWiseHireInvite } from '@/lib/wisehire/inviteTokenClient';

/** Compatibility bridge for invitation URLs issued by the older early-access UI. */
export default function WiseHireEarlyAccessPage() {
  const { code = '' } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email')?.trim() || '';

  useLayoutEffect(() => {
    if (code) rememberWiseHireInvite(code);
    if (code && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/wisehire/signup');
    } else {
      removeSensitiveParamsFromCurrentAddressBar(['email']);
    }
  }, [code]);

  const destination = email
    ? `/wisehire/signup?email=${encodeURIComponent(email)}`
    : '/wisehire/signup';
  return <Navigate to={destination} replace />;
}
