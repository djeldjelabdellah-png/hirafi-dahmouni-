export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, craftsmanId, action } = req.body;

  if (!token || !craftsmanId || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SB_HEADERS = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  const sessionRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}`,
    { headers: SB_HEADERS }
  );
  const sessions = await sessionRes.json();
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(401).json({ error: 'جلسة غير صالحة، يرجى تسجيل الدخول من جديد' });
  }

  try {
    if (action === 'approve') {
      await fetch(`${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${craftsmanId}`, {
        method: 'PATCH',
        headers: SB_HEADERS,
        body: JSON.stringify({ status: 'approved' }),
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${craftsmanId}`, {
        method: 'DELETE',
        headers: SB_HEADERS,
      });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'فشل تنفيذ الإجراء' });
  }
}
