import { Client, Users, Databases, ID, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const users = new Users(client);
  const databases = new Databases(client);

  const { method, path, body } = req;

  log('Auth-Master Request: ' + method + ' ' + path);

  try {
    // 1. GET /me - Fetch current user profile
    if (path === '/me' && method === 'GET') {
      const userId = req.headers['x-appwrite-user-id'];
      if (!userId) return res.json({ status: 'error', message: 'Unauthorized' }, 401);

      const profile = await databases.listDocuments('main', 'profiles', [
        Query.equal('user_id', userId)
      ]);

      if (profile.total === 0) {
        return res.json({ status: 'error', message: 'Profile not found' }, 404);
      }

      return res.json({ status: 'success', data: profile.documents[0] });
    }

    // 2. POST /register - Create user and profile
    if (path === '/register' && method === 'POST') {
      const { email, password, name } = JSON.parse(body);

      // Create Auth User
      const user = await users.create(ID.unique(), email, undefined, password, name);
      
      // Create DB Profile
      const profile = await databases.createDocument('main', 'profiles', ID.unique(), {
        user_id: user.$id,
        email: email,
        full_name: name,
        onboarding_completed: false
      });

      return res.json({ status: 'success', data: { user, profile } });
    }

    return res.json({ status: 'error', message: 'Route not found' }, 404);

  } catch (err) {
    error('Auth-Master Error: ' + err.message);
    return res.json({ status: 'error', message: err.message }, 500);
  }
};
