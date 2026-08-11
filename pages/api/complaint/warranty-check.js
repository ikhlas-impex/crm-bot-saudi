export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { category, dop } = req.body || {};

  if (!category || !dop) {
    return res.status(400).json({ success: false, message: 'category and dop are required' });
  }

  try {
    const r = await fetch('https://n8n.srv1623198.hstgr.cloud/webhook/impex-warranty-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, dop }),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('warranty-check proxy failed', err);
    return res.status(502).json({ success: false, message: 'Warranty check service unavailable' });
  }
}
