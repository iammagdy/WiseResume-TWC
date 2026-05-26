const PARAM_BASE = 'https://local.invalid/';

function readQueryParams(query: string): URLSearchParams {
  const normalized = query.startsWith('?') ? query : query ? `?${query}` : '';
  return new URL(`${PARAM_BASE}${normalized}`).searchParams;
}

/**
 * Parse Appwrite email callback query params (verification, recovery).
 * Appwrite appends userId + secret to the redirect URL in verification emails.
 */
export function getAuthEmailCallbackParams(search: string, hash = ''): {
  userId: string | null;
  secret: string | null;
} {
  const fromSearch = readQueryParams(search.startsWith('?') ? search : search ? `?${search}` : '');
  let userId = fromSearch.get('userId') ?? fromSearch.get('userid');
  let secret = fromSearch.get('secret');

  if (!userId || !secret) {
    const hashQuery = hash.replace(/^#\/?/, '').replace(/^\?/, '');
    if (hashQuery) {
      const fromHash = readQueryParams(hashQuery.startsWith('?') ? hashQuery : `?${hashQuery}`);
      userId = userId ?? fromHash.get('userId') ?? fromHash.get('userid');
      secret = secret ?? fromHash.get('secret');
    }
  }

  return { userId, secret };
}

export function hasAuthEmailCallbackParams(search: string, hash = ''): boolean {
  const { userId, secret } = getAuthEmailCallbackParams(search, hash);
  return Boolean(userId && secret);
}
