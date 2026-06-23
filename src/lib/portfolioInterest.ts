import { appwriteFunctions } from '@/lib/appwrite-functions';

// "I'm Interested" beacon. Routed through the public-share Appwrite function
// (action: portfolio-interest), which uses a properly-scoped server key — so this
// no longer depends on a Vercel APPWRITE_API_KEY env var.
export async function sendPortfolioInterest(
  username: string,
  token: string,
): Promise<{ ok: boolean; duplicate?: boolean }> {
  const { data, error } = await appwriteFunctions.invoke<{ ok?: boolean; duplicate?: boolean }>(
    'portfolio-interest',
    {
      body: {
        username: username.toLowerCase(),
        token,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      },
    },
  );

  if (error || !data?.ok) return { ok: false };
  return { ok: true, duplicate: Boolean(data.duplicate) };
}
