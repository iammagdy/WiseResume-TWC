import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function useAdminStatus() {
  const { user, authSettled, loading } = useAuth();

  const isAdmin = useMemo(() => {
    if (!authSettled || loading) return false;
    return Array.isArray(user?.labels) && user.labels.includes('admin');
  }, [authSettled, loading, user?.labels]);

  return {
    isAdmin,
    isLoading: !authSettled || loading,
  };
}

export function useIsAdmin() {
  return useAdminStatus().isAdmin;
}
