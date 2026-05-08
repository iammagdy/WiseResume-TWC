import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';

export function usePublicPortfolio(username: string | undefined) {
  return useQuery({
    queryKey: ['public-portfolio', username],
    queryFn: async () => {
      if (!username) return null;
      const profileRes = await databases.listDocuments(DATABASE_ID, 'profiles', [
        Query.equal('username', username.toLowerCase())
      ]);
      if (profileRes.total === 0) return null;
      const p = profileRes.documents[0];
      const resumeRes = await databases.listDocuments(DATABASE_ID, 'resumes', [
        Query.equal('user_id', p.user_id),
        Query.limit(1)
      ]);
      return { profile: p, resume: resumeRes.documents[0] || null };
    },
    enabled: !!username,
  });
}

export function validateCustomDomain(domain: string) { return true; }
export function usePortfolioGate() { return { isAllowed: true, loading: false }; }
export function isAppHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', 'thewise.cloud'].some(h => hostname.includes(h));
}
export function usePublicPortfolioByDomain(domain: string | null) {
  return useQuery({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => null,
    enabled: !!domain,
  });
}
