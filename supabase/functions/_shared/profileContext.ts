import { getServiceClient } from './dbClient.ts';

export interface ProfileContext {
  career_level: string;
  industry: string;
  job_title: string;
  contextString: string;
}

/**
 * Fetches the user's profile row and returns structured profile context.
 * Degrades gracefully if the profile row does not exist — returns empty strings
 * and an empty contextString so callers can safely inject without checking.
 */
export async function getProfileContext(userId: string): Promise<ProfileContext> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('career_level, industry, job_title')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[profileContext] Failed to fetch profile:', error.message);
      return { career_level: '', industry: '', job_title: '', contextString: '' };
    }

    if (!data) {
      return { career_level: '', industry: '', job_title: '', contextString: '' };
    }

    const career_level = (data.career_level as string) || '';
    const industry = (data.industry as string) || '';
    const job_title = (data.job_title as string) || '';

    let contextString = '';
    if (career_level || industry || job_title) {
      const parts: string[] = [];
      if (career_level && industry) {
        parts.push(`The candidate is a ${career_level}-level professional in the ${industry} industry`);
      } else if (career_level) {
        parts.push(`The candidate is a ${career_level}-level professional`);
      } else if (industry) {
        parts.push(`The candidate works in the ${industry} industry`);
      }
      if (job_title) {
        parts.push(`currently working as a ${job_title}`);
      }
      contextString = parts.join(', ') + '.';
    }

    return { career_level, industry, job_title, contextString };
  } catch (err) {
    console.warn('[profileContext] Unexpected error fetching profile:', err);
    return { career_level: '', industry: '', job_title: '', contextString: '' };
  }
}
