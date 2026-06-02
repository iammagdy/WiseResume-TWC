import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export const ADMIN_EMAIL = 'magdy.saber@outlook.com';

export function useAdminStatus() {
  const { user, authSettled, loading } = useAuth();

  const isAdmin = useMemo(() => {
    if (!authSettled || loading) return false;
    return user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
  }, [authSettled, loading, user?.email]);

  return {
    isAdmin,
    isLoading: !authSettled || loading,
  };
}

export function useIsAdmin() {
  return useAdminStatus().isAdmin;
}
