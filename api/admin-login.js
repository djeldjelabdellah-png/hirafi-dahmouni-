export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pin } = req.body;
  const ADMIN_PIN = process.env.ADMIN_PIN;

  if (!pin || pin !== ADMIN_PIN) {
    return res.status(401).json({ success: false, error: 'رمز خاطئ' });
  }

  const sessionToken = Buffer.from(`admin_${Date.now()}_${Math.random()}`).toString('base64');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/admin_sessions`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: sessionToken,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }),
    });
  } catch (e) {
    console.error('Session save failed:', e);
  }

  return res.status(200).json({ success: true, token: sessionToken });
}
