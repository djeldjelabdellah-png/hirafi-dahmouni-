export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // طلب من تليغرام (ضغطة زر) — شكل مختلف عن طلبات التطبيق
  if (req.body.callback_query) {
    const cq = req.body.callback_query;
    const sep = cq.data.indexOf('_');
    const tgAction = cq.data.slice(0, sep);
    const tgCraftsmanId = cq.data.slice(sep + 1);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const SB_HEADERS = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    try {
      if (tgAction === 'approve') {
        await fetch(`${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${tgCraftsmanId}`, {
          method: 'PATCH',
          headers: SB_HEADERS,
          body: JSON.stringify({ status: 'approved' })
        });
      } else if (tgAction === 'reject') {
        await fetch(`${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${tgCraftsmanId}`, {
          method: 'DELETE',
          headers: SB_HEADERS
        });
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: cq.id,
          text: tgAction === 'approve' ? '✅ تم القبول' : '❌ تم الرفض'
        })
      });

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cq.message.chat.id,
          message_id: cq.message.message_id,
          reply_markup: { inline_keyboard: [] }
        })
      });
    } catch (e) {
      console.error('TELEGRAM CALLBACK ERROR:', e);
}

    return res.status(200).json({ ok: true });
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
    Prefer: 'return=representation'
  };

  const sessionRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}`,
    {
      headers: SB_HEADERS
    }
  );

  const sessions = await sessionRes.json();

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(401).json({
      error: 'جلسة غير صالحة، يرجى تسجيل الدخول من جديد'
    });
  }

  try {
    if (action === 'approve') {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${craftsmanId}`,
        {
          method: 'PATCH',
          headers: SB_HEADERS,
          body: JSON.stringify({
            status: 'approved'
          })
        }
      );

      const result = await response.text();

      console.log('APPROVE STATUS:', response.status);
      console.log('APPROVE RESPONSE:', result);

      if (!response.ok) {
        throw new Error(result);
      }
    } else {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/craftsmen?id=eq.${craftsmanId}`,
        {
          method: 'DELETE',
          headers: SB_HEADERS
        }
      );

      const result = await response.text();

      console.log('REJECT STATUS:', response.status);
      console.log('REJECT RESPONSE:', result);

      if (!response.ok) {
        throw new Error(result);
      }
    }

    return res.status(200).json({
      success: true
    });
  } catch (e) {
    console.error('ADMIN ACTION ERROR:', e);

    return res.status(500).json({
      error: e.message || 'فشل تنفيذ الإجراء'
    });
  }
}
