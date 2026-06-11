import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchAppSettingsFromDb } from '../server/appSettingsFetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=60');

  try {
    const settings = await fetchAppSettingsFromDb();
    return res.status(200).json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load app settings';
    return res.status(500).json({ error: 'server_error', message });
  }
}
