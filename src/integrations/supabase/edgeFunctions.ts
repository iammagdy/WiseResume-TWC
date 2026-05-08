/**
 * Edge-functions invoker — Appwrite-Native.
 *
 * The Supabase fallback path has been removed. This wrapper now ONLY
 * routes the AI-Hub function set (see `appwrite-bridge.ts`
 * `AI_HUB_FUNCTIONS`) through the Appwrite `ai-gateway` Function.
 * Anything outside that set throws a clear migration error and must be
 * rebuilt on Appwrite.
 */

import { shouldRouteToAppwrite, invokeAppwriteHub } from '@/lib/appwrite-bridge';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const edgeFunctions = {
  functions: {
    invoke: async (fnName: string, options?: any) => {
      if (shouldRouteToAppwrite(fnName)) {
        return await invokeAppwriteHub(fnName, options ?? {});
      }
      const message =
        `[edgeFunctions] '${fnName}' is not in the Appwrite AI-Hub set ` +
        `and the Supabase fallback has been removed. Pending Appwrite migration.`;
      console.warn(message);
      return {
        data: null,
        error: { message, code: 'pending_appwrite_migration' },
      };
    },
  },
};
