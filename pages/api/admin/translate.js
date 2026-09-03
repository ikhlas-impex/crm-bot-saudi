async function translateSingle(text) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url);
    const data = await r.json();
    return (data[0] || []).map((chunk) => chunk[0]).join('');
  } catch (err) {
    console.error('Single translation failed for:', text, err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { text, texts } = req.body || {};

  // Single text request
  if (text && typeof text === 'string') {
    const translated = await translateSingle(text);
    return res.status(200).json({ success: true, translated });
  }

  // Batch texts request
  if (Array.isArray(texts)) {
    const uniqueTexts = Array.from(new Set(texts.filter(t => typeof t === 'string' && t.trim())));
    
    // Process translations in parallel
    const results = await Promise.all(
      uniqueTexts.map(async (str) => {
        const tr = await translateSingle(str);
        return [str, tr];
      })
    );

    const translations = {};
    for (const [orig, tr] of results) {
      if (tr) translations[orig] = tr;
    }

    return res.status(200).json({ success: true, translations });
  }

  return res.status(400).json({ success: false, message: 'text or texts array is required' });
}
