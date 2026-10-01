import { validateSession } from '../../../lib/validateSession';

// Returns the Moyasar record behind an online payment so admins can verify it
// without the secret key ever reaching the browser.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid, paymentId } = req.body || {};
  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'paymentId is required' });
  }

  try {
    const session = await validateSession(sessionid);
    if (!session.valid) {
      return res.status(401).json({ success: false, message: session.message });
    }

    const auth = Buffer.from(`${process.env.MOYASAR_SECRET_KEY}:`).toString('base64');
    const r = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const p = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ success: false, message: p.message || 'Payment not found on Moyasar' });
    }

    return res.status(200).json({
      success: true,
      payment: {
        id: p.id,
        status: p.status,
        amount: p.amount / 100,
        currency: p.currency,
        refunded: (p.refunded || 0) / 100,
        description: p.description,
        createdAt: p.created_at,
        live: p.live ?? !String(process.env.MOYASAR_SECRET_KEY || '').startsWith('sk_test'),
        sourceType: p.source?.type,
        cardBrand: p.source?.company,
        cardName: p.source?.name,
        cardNumber: p.source?.number, // already masked by Moyasar, e.g. 4111-11XX-XXXX-1111
        gatewayMessage: p.source?.message,
        metadata: p.metadata || {},
      },
    });
  } catch (err) {
    console.error('payment-details error:', err);
    return res.status(500).json({ success: false, message: 'Could not load payment details' });
  }
}
