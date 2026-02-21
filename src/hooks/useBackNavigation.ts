import { useNavigate, useLocation } from 'react-router-dom';
import { getBackRoute } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Centralized back navigation hook.
 * Uses the BACK_ROUTES map for consistent behavior across all pages.
 */
export function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return () => {
    const route = getBackRoute(location.pathname, !!user);
    navigate(route);
  };
}
