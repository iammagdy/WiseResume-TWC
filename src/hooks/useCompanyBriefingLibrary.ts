import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, Query, ID, Permission, Role } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite-collections';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { CompanyBriefing } from '@/types/companyBriefing';

export interface SavedCompanyBriefing {
  id: string;
  user_id: string;
  company_name: string;
  briefing: CompanyBriefing;
  created_at: string;
}

const COMPANY_BRIEFING_REQUIRED_FIELDS = ['user_id', 'company_name', 'briefing'] as const;

export function getCompanyBriefingSchemaHelpMessage() {
  return 'Company Briefing library is not fully set up yet. Appwrite must add the `company_name` and `briefing` attributes to `company_briefings` and grant create permission to authenticated users before Save can work.';
}

export function toCompanyBriefingSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  // Schema gaps (missing attributes) and permission gaps (collection lacks a
  // create permission for authenticated users) both surface as "setup not done
  // yet". The live blocker is `No permissions provided for action 'create'`,
  // which is a collection-permission issue, not a code bug.
  if (
    normalized.includes('unknown attribute') ||
    normalized.includes('invalid document structure') ||
    normalized.includes('attribute not found') ||
    normalized.includes('attribute is not available') ||
    normalized.includes('no permissions provided') ||
    normalized.includes('not authorized') ||
    normalized.includes('missing scope') ||
    normalized.includes('permission') ||
    COMPANY_BRIEFING_REQUIRED_FIELDS.some((field) => normalized.includes(field))
  ) {
    return getCompanyBriefingSchemaHelpMessage();
  }
  return 'Failed to save briefing';
}

function docToBriefing(doc: Record<string, unknown>): SavedCompanyBriefing {
  const raw = doc.briefing;
  const briefing: CompanyBriefing =
    typeof raw === 'string' ? JSON.parse(raw) : (raw as CompanyBriefing);
  return {
    id: doc.$id as string,
    user_id: doc.user_id as string,
    company_name: doc.company_name as string,
    briefing,
    created_at: doc.$createdAt as string,
  };
}

export function useCompanyBriefingLibrary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['company-briefings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.company_briefings, [
        Query.equal('user_id', user.id),
        Query.orderDesc('$createdAt'),
        Query.limit(100),
      ]);
      return res.documents.map(d => docToBriefing(d as unknown as Record<string, unknown>));
    },
    enabled: !!user,
  });
}

export function useSaveCompanyBriefing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { company_name: string; briefing: CompanyBriefing }) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.company_briefings,
        ID.unique(),
        {
          user_id: user.id,
          company_name: input.company_name,
          briefing: JSON.stringify(input.briefing),
        },
        // The collection uses document-level security (see
        // scripts/setup_company_briefings_schema.cjs), so each briefing must
        // carry explicit owner permissions for the user to read/update/delete it.
        [
          Permission.read(Role.user(user.id)),
          Permission.update(Role.user(user.id)),
          Permission.delete(Role.user(user.id)),
        ],
      );
      return docToBriefing(doc as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-briefings'] });
      toast.success('Briefing saved!');
    },
    onError: (error: unknown) => toast.error(toCompanyBriefingSaveErrorMessage(error)),
  });
}

export function useDeleteCompanyBriefing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.company_briefings, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-briefings'] });
      toast.success('Briefing deleted');
    },
    onError: () => toast.error('Failed to delete briefing'),
  });
}
