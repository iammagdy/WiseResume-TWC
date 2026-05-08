import { useQuery } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query } from '@/lib/appwrite';
import type { Experience, Education, Project, Certification, Award, Publication, Volunteering, Hobby } from '@/types/resume';

export interface PublicProfile {
  fullName: string | null;
  avatarUrl: string | null;
  username: string;
  portfolioBio: string | null;
}

export interface PublicResume {
  id: string;
  title: string;
  summary: string | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

export interface PublicPortfolioData {
  profile: PublicProfile;
  resume: PublicResume;
}

async function fetchPublicPortfolio(username: string): Promise<PublicPortfolioData | null> {
  const profileRes = await databases.listDocuments(DATABASE_ID, 'profiles', [
    Query.equal('username', username.toLowerCase())
  ]);

  if (profileRes.total === 0) return null;
  const p = profileRes.documents[0];

  const resumeRes = await databases.listDocuments(DATABASE_ID, 'resumes', [
    Query.equal('user_id', p.user_id),
    Query.limit(1)
  ]);

  const r = resumeRes.documents[0] || {};

  return {
    profile: {
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      username: p.username,
      portfolioBio: p.portfolio_bio
    },
    resume: {
      id: r.$id || '',
      title: r.title || 'Untitled',
      summary: r.summary || '',
      experience: [], // Details would be fetched from sub-collections if needed
      education: [],
      skills: []
    }
  };
}

export function usePublicPortfolio(username: string | undefined) {
  return useQuery({
    queryKey: ['public-portfolio', username],
    queryFn: () => fetchPublicPortfolio(username!),
    enabled: !!username,
    retry: false,
  });
}

export function isAppHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', 'thewise.cloud'].some(h => hostname.includes(h));
}

export function usePublicPortfolioByDomain(domain: string | null) {
  return useQuery({
    queryKey: ['public-portfolio-by-domain', domain],
    queryFn: async () => null, // Placeholder for custom domain logic in Appwrite
    enabled: !!domain,
  });
}
