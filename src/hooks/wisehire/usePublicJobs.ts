import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/safeClient';

export interface PublicRole {
  id: string;
  title: string;
  slug: string | null;
  jd_text: string | null;
  location: string | null;
  remote_ok: boolean;
  salary_min: number | null;
  salary_max: number | null;
  employment_type: string | null;
  created_at: string;
  company: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
}

export function usePublicCompanyJobs(companySlug: string | undefined) {
  return useQuery({
    queryKey: ['public-jobs-company', companySlug],
    queryFn: async (): Promise<{ company: { id: string; name: string; slug: string } | null; roles: PublicRole[] }> => {
      if (!companySlug) return { company: null, roles: [] };

      const { data: company, error: compErr } = await supabase
        .from('wisehire_companies')
        .select('id, name, slug')
        .eq('slug', companySlug)
        .maybeSingle();

      if (compErr || !company) return { company: null, roles: [] };

      const { data: roles, error: rolesErr } = await supabase
        .from('wisehire_roles')
        .select('id, title, slug, jd_text, location, remote_ok, salary_min, salary_max, employment_type, created_at')
        .eq('company_id', company.id)
        .eq('published', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (rolesErr) return { company, roles: [] };

      return {
        company,
        roles: (roles ?? []).map((r) => ({ ...r, company })),
      };
    },
    enabled: !!companySlug,
    staleTime: 60_000,
  });
}

export function usePublicRole(companySlug: string | undefined, roleSlug: string | undefined) {
  return useQuery({
    queryKey: ['public-role', companySlug, roleSlug],
    queryFn: async (): Promise<PublicRole | null> => {
      if (!companySlug || !roleSlug) return null;

      const { data: company } = await supabase
        .from('wisehire_companies')
        .select('id, name, slug')
        .eq('slug', companySlug)
        .maybeSingle();

      if (!company) return null;

      const { data: role } = await supabase
        .from('wisehire_roles')
        .select('id, title, slug, jd_text, location, remote_ok, salary_min, salary_max, employment_type, created_at')
        .eq('slug', roleSlug)
        .eq('company_id', company.id)
        .eq('published', true)
        .eq('is_deleted', false)
        .maybeSingle();

      if (!role) return null;
      return { ...role, company } as PublicRole;
    },
    enabled: !!companySlug && !!roleSlug,
    staleTime: 60_000,
  });
}

export function useAllPublishedRoles() {
  return useQuery({
    queryKey: ['public-jobs-all'],
    queryFn: async (): Promise<PublicRole[]> => {
      const { data: roles } = await supabase
        .from('wisehire_roles')
        .select('id, title, slug, jd_text, location, remote_ok, salary_min, salary_max, employment_type, created_at, company_id')
        .eq('published', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!roles || roles.length === 0) return [];

      const companyIds = [...new Set(roles.map((r) => r.company_id).filter(Boolean))];
      const { data: companies } = await supabase
        .from('wisehire_companies')
        .select('id, name, slug')
        .in('id', companyIds);

      const companyMap = Object.fromEntries((companies ?? []).map((c) => [c.id, c]));

      return roles.map((r) => ({
        ...r,
        company: companyMap[r.company_id] ?? null,
      })) as PublicRole[];
    },
    staleTime: 60_000,
  });
}
