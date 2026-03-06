import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Password reset is now handled by Clerk's built-in flow.
 * This page redirects users to the auth page.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/auth?mode=forgot', { replace: true });
  }, [navigate]);

  return null;
}
