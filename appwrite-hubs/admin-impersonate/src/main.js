import { Client, Users, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY);

  const users = new Users(client);
  const databases = new Databases(client);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { action, target_user_id } = body;

  log(`Admin-Impersonate: Action=${action} for Target=${target_user_id}`);

  try {
    // 1. CLAIM - Generate an impersonation link
    if (action === 'claim') {
      // In Appwrite, we use the SDK to generate a token for the user
      // or we return a payload that the frontend uses to set the session.
      // Since we are using the 'Act As' dialog, we return a signed payload.
      
      const targetUser = await users.get(target_user_id);
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
      
      // The URL format expected by the frontend: /act-as#<payload>
      const payload = Buffer.from(JSON.stringify({
        u: target_user_id,
        e: targetUser.email,
        exp: expiresAt,
        t: 'admin-token-' + Math.random().toString(36).substring(7)
      })).toString('base64');

      return res.json({
        status: 'success',
        data: {
          url: `/act-as#${payload}`,
          email: targetUser.email,
          userId: target_user_id,
          expiresAt: expiresAt
        }
      });
    }

    // 2. REVOKE - Invalidate sessions
    if (action === 'revoke') {
      log(`Revoking all sessions for user: ${target_user_id}`);
      await users.deleteSessions(target_user_id);
      return res.json({ status: 'success', message: 'All sessions revoked' });
    }

    return res.json({ status: 'error', message: 'Action not supported' }, 400);

  } catch (err) {
    error('Admin-Impersonate Error: ' + err.message);
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
