export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { sessionid, uid, action, rejectionreason } = req.body || {};

  if (!uid || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: "uid and a valid action ('approve' | 'reject') are required" });
  }

  try {
    // Delegate the verification logic, sheet updating, and WhatsApp messaging to the n8n webhook
    const n8nRes = await fetch('https://n8n.srv1623198.hstgr.cloud/webhook/impex-payment-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionid, uid, action, rejectionreason }),
    });

    let data;
    try {
      data = await n8nRes.json();
    } catch (e) {
      data = { success: n8nRes.ok, message: await n8nRes.text() };
    }

    if (!n8nRes.ok) {
      return res.status(n8nRes.status).json(data);
    }

    // Ensure the response always contains a truthy success field for the frontend to proceed
    return res.status(200).json({ success: true, ...data });
  } catch (err) {
    console.error('n8n webhook error:', err);
    return res.status(500).json({ success: false, message: 'Internal error communicating with n8n workflow', error: String(err) });
  }
}
