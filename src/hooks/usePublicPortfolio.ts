import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';
import type { Experience, Education, Project, Certification, Award, Publication, Volunteering, Hobby } from '@/types/resume';

export interface PublicProfile {
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  industry: string | null;
  careerLevel: string | null;
  location: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  contactEmail: string | null;
  portfolioBio: string | null;
  theme: string | null; // For theme customization
  views: number; // For view tracking
  username: string;
}

export interface PublicResume {
  id: string;
  title: string;
  summary: string | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  publications: Publication[];
  volunteering: Volunteering[];
  hobbies: Hobby[];
}

export interface PublicPortfolioData {
  profile: PublicProfile;
  resume: PublicResume;
}

async function fetchPublicPortfolio(username: string): Promise<PublicPortfolioData | null> {
  const { data, error } = await supabase.rpc('get_public_portfolio', {
    p_username: username.toLowerCase(),
  });

  if (error) {
    console.error('Error fetching public portfolio:', error);
    throw error;
  }

  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const profile = raw.profile as Record<string, unknown>;
  const resume = raw.resume as Record<string, unknown>;

  return {
    profile: {
      fullName: (profile.fullName as string) || null,
      avatarUrl: (profile.avatarUrl as string) || null,
      jobTitle: (profile.jobTitle as string) || null,
      industry: (profile.industry as string) || null,
      careerLevel: (profile.careerLevel as string) || null,
      location: (profile.location as string) || null,
      linkedinUrl: (profile.linkedinUrl as string) || null,
      githubUrl: (profile.githubUrl as string) || null,
      websiteUrl: (profile.websiteUrl as string) || null,
      twitterUrl: (profile.twitterUrl as string) || null,
      contactEmail: (profile.contactEmail as string) || null,
      portfolioBio: (profile.portfolioBio as string) || null,
      theme: (profile.theme as string) || null,
      views: (profile.views as number) || 0,
      username: (profile.username as string) || username,
    },
    resume: {
      id: (resume.id as string) || '',
      title: (resume.title as string) || 'Untitled',
      summary: (resume.summary as string) || null,
      experience: (resume.experience as Experience[]) || [],
      education: (resume.education as Education[]) || [],
      skills: (resume.skills as string[]) || [],
      projects: (resume.projects as Project[]) || [],
      certifications: (resume.certifications as Certification[]) || [],
      awards: (resume.awards as Award[]) || [],
      publications: (resume.publications as Publication[]) || [],
      volunteering: (resume.volunteering as Volunteering[]) || [],
      hobbies: (resume.hobbies as Hobby[]) || [],
    },
  };
}

export function usePublicPortfolio(username: string | undefined) {
  return useQuery({
    queryKey: ['public-portfolio', username],
    queryFn: () => fetchPublicPortfolio(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
