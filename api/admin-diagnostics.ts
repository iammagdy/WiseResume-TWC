import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases, Query, Account } from 'node-appwrite';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const VISITS_COLLECTION = 'portfolio_visits';
const PROFILES_COLLECTION = 'profiles';
const NOTIFICATIONS_COLLECTION = 'notifications';

const ALLOWED_OWNER_ID = '69fd4c3d000b06337cd7';
const USERNAME_UNDER_TEST = 'magdy';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Gated by ADMIN_DIAGNOSTICS_ENABLED flag
  if (process.env.ADMIN_DIAGNOSTICS_ENABLED !== 'true') {
    return res.status(404).json({ error: 'not_found', message: 'Diagnostics endpoint disabled' });
  }

  // Allow only GET requests for the diagnostic dashboard
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Only GET is supported' });
  }

  // 2. Read Authorization Bearer token (Appwrite JWT)
  const authHeader = req.headers['authorization'];
  let jwtToken = '';
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    jwtToken = authHeader.substring(7).trim();
  }

  if (!jwtToken) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing Authorization Bearer JWT token' });
  }

  try {
    // 3. Verify authenticated user exists using the JWT
    const clientWithJwt = new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID)
      .setJWT(jwtToken);
    const account = new Account(clientWithJwt);
    const userProfile = await account.get();
    const userId = userProfile.$id;

    // 4. Verify user is allowed to access diagnostics (restrict to Owner/Admin)
    if (userId !== ALLOWED_OWNER_ID) {
      console.warn(`[diagnostics] Access forbidden for userId: ${userId}`);
      return res.status(403).json({ error: 'forbidden', message: 'Access denied: owner only' });
    }

    // 5. Query metrics using the admin client (API_KEY)
    const adminClient = new Client()
      .setEndpoint(ENDPOINT)
      .setProject(PROJECT_ID)
      .setKey(API_KEY);
    const db = new Databases(adminClient);

    // Resolve ownerUserId for /p/magdy
    let resolvedOwnerUserId = '';
    try {
      const profilesRes = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
        Query.equal('username', USERNAME_UNDER_TEST),
        Query.limit(1)
      ]);
      if (profilesRes.total > 0) {
        resolvedOwnerUserId = String(profilesRes.documents[0].user_id ?? '');
      }
    } catch (e) {
      console.error('[diagnostics] Profile lookup failed:', e);
    }

    // Notifications Total
    const notificationsTotalRes = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.limit(1)
    ]);
    const notificationsTotal = notificationsTotalRes.total;

    // Notifications Unread
    const notificationsUnreadRes = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.equal('is_read', false),
      Query.limit(1)
    ]);
    const notificationsUnread = notificationsUnreadRes.total;

    // Notifications by type
    const notificationsVisits = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.equal('type', 'portfolio_visit'),
      Query.limit(1)
    ]);
    const notificationsInterests = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.equal('type', 'portfolio_interest'),
      Query.limit(1)
    ]);
    const notificationsMessages = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.equal('type', 'portfolio_message'),
      Query.limit(1)
    ]);

    // Visits Total
    const visitsTotalRes = await db.listDocuments(DATABASE_ID, VISITS_COLLECTION, [
      Query.equal('username', USERNAME_UNDER_TEST),
      Query.limit(1)
    ]);
    const visitsTotal = visitsTotalRes.total;

    // Latest Visit
    let latestVisit: Record<string, unknown> | null = null;
    const latestVisitRes = await db.listDocuments(DATABASE_ID, VISITS_COLLECTION, [
      Query.equal('username', USERNAME_UNDER_TEST),
      Query.orderDesc('$createdAt'),
      Query.limit(1)
    ]);
    if (latestVisitRes.total > 0) {
      const v = latestVisitRes.documents[0];
      latestVisit = {
        id: v.$id,
        createdAt: v.$createdAt,
        device: v.device,
        ref: v.ref,
        time_spent_seconds: v.time_spent_seconds
      };
    }

    // Latest Notification
    let latestNotification: Record<string, unknown> | null = null;
    const latestNotificationRes = await db.listDocuments(DATABASE_ID, NOTIFICATIONS_COLLECTION, [
      Query.equal('user_id', ALLOWED_OWNER_ID),
      Query.orderDesc('$createdAt'),
      Query.limit(1)
    ]);
    if (latestNotificationRes.total > 0) {
      const n = latestNotificationRes.documents[0];
      latestNotification = {
        id: n.$id,
        createdAt: n.$createdAt,
        type: n.type,
        title: n.title,
        message: n.message,
        is_read: n.is_read
      };
    }

    return res.status(200).json({
      status: 'success',
      owner: {
        userId: ALLOWED_OWNER_ID,
        email: userProfile.email
      },
      portfolio: {
        username: USERNAME_UNDER_TEST,
        resolvedOwnerUserId,
        match: resolvedOwnerUserId === ALLOWED_OWNER_ID
      },
      counts: {
        notificationsTotal,
        notificationsUnread,
        portfolioVisitNotifications: notificationsVisits.total,
        portfolioInterestNotifications: notificationsInterests.total,
        portfolioMessageNotifications: notificationsMessages.total,
        visitsTotal
      },
      latestVisit,
      latestNotification
    });

  } catch (err) {
    const msg = (err as { message?: string })?.message ?? 'Unknown authentication error';
    return res.status(401).json({ error: 'unauthorized', message: msg });
  }
}
