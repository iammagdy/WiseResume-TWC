interface BroadcastLoadContext {
  isPublicStandalone: boolean;
  authReady: boolean;
  userId?: string | null;
}

export function shouldLoadBroadcasts({
  isPublicStandalone,
  authReady,
  userId,
}: BroadcastLoadContext): boolean {
  return !isPublicStandalone && authReady && !!userId;
}
