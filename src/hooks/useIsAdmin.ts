import { useAuth } from '@/hooks/useAuth';

export const ADMIN_EMAIL = 'magdy.saber@outlook.com';

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return !!user && user.email?.toLowerCase() === ADMIN_EMAIL;
}
