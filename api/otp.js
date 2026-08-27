export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, name } = req.body;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SB_HEADERS = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  if (action === 'send') {
    if (!email) return res.status(400).json({ error: 'email required' });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE', headers: SB_HEADERS,
    });
    await fetch(`${SUPABASE_URL}/rest/v1/otp_codes`, {
      method: 'POST', headers: SB_HEADERS,
      body: JSON.stringify({ email, code, expires_at: expiresAt }),
    });
try {
  console.log('DEBUG - has private key:', !!process.env.EMAILJS_PRIVATE_KEY, 'length:', process.env.EMAILJS_PRIVATE_KEY ? process.env.EMAILJS_PRIVATE_KEY.length : 0);
      const emailRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_2kewus8',
          template_id: 'template_o73g9ys',
         user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          private_key: process.env.EMAILJS_PRIVATE_KEY,
          template_params: { to_email: email, otp_code: code, to_name: name || '' },
        }),
      });
      const emailText = await emailRes.text();
      console.log('EmailJS status:', emailRes.status, 'response:', emailText);
      if (!emailRes.ok) {
        return res.status(500).json({ error: 'فشل إرسال البريد: ' + emailText });
      }
    } catch (e) {
      console.error('EmailJS send failed:', e);
      return res.status(500).json({ error: 'فشل إرسال البريد' });
    }

    return res.status(200).json({ success: true });
  }

  if (action === 'verify') {
    const { code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'email and code required' });

    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email)}&code=eq.${code}&expires_at=gt.${new Date().toISOString()}`,
      { headers: SB_HEADERS }
    );
    const matches = await checkRes.json();

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(401).json({ success: false, error: 'رمز غير صحيح أو منتهي الصلاحية' });
    }

    await fetch(`${SUPABASE_URL}/rest/v1/otp_codes?email=eq.${encodeURIComponent(email)}`, {
      method: 'DELETE', headers: SB_HEADERS,
    });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
