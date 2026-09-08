export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, message: 'text is required' });
  }

  try {
    // Same free/unofficial endpoint already used elsewhere in this project
    // for Arabic dealer name transliteration - server-side call avoids the
    // CORS restriction that blocks calling this directly from the browser.
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url);
    const data = await r.json();

    // Response shape: [[[translatedChunk, originalChunk, ...], ...], ...]
    const translated = (data[0] || []).map((chunk) => chunk[0]).join('');

    return res.status(200).json({ success: true, translated });
  } catch (err) {
    console.error('translate proxy failed', err);
    return res.status(502).json({ success: false, message: 'Translation service unavailable' });
  }
}
