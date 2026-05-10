import { Client, Users, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY);

  const users = new Users(client);

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { action, target_user_id, __headers } = body;

  // 0. AUTH CHECK
  // Appwrite SDK executions don't support custom headers, so the frontend
  // passes them in the body as __headers.
  const authHeader = __headers?.Authorization || req.headers?.authorization;
  const token = authHeader?.replace('Bearer ', '');
  const correctPass = process.env.DEVKIT_PASSWORD;

  if (!token || token !== correctPass) {
    error('Unauthorized: Invalid DevKit Token');
    return res.json({ status: 'error', message: 'Unauthorized: Session expired or invalid' }, 401);
  }

  log(`Admin-Impersonate: Action=${action} for Target=${target_user_id}`);

  try {
    // 1. CLAIM - Generate an impersonation link
    if (action === 'claim') {
      const targetUser = await users.get(target_user_id);
      const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
      
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
