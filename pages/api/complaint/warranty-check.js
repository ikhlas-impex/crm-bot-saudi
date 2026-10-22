import eligibleModels from '../../../data/eligible-models.json';

// Products are covered for this many months from the date of purchase.
// (Previously decided by the n8n impex-warranty-check webhook with a 12-month rule.)
const WARRANTY_MONTHS = 24;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { category, dop } = req.body || {};

  if (!category || !dop) {
    return res.status(400).json({ success: false, message: 'category and dop are required' });
  }

  // dop comes from <input type="date"> as YYYY-MM-DD
  const [y, m, d] = String(dop).split('-').map(Number);
  const purchaseDate = new Date(Date.UTC(y, m - 1, d));
  if (!y || !m || !d || isNaN(purchaseDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date of purchase' });
  }

  const warrantyEnd = new Date(purchaseDate);
  warrantyEnd.setUTCMonth(warrantyEnd.getUTCMonth() + WARRANTY_MONTHS);

  const warrantystatus = Date.now() < warrantyEnd.getTime() ? 'IW' : 'OW';

  // Use authoritative charge configured in eligible-models.json (e.g. Refrigerator is 300 SAR)
  const modelConfig = eligibleModels.categories[category];
  const chargeamount = modelConfig?.charge || (category === 'Refrigerator' ? 300 : 0);

  return res.status(200).json({
    success: true,
    warrantystatus,
    chargeamount,
    warrantyend: warrantyEnd.toISOString().slice(0, 10),
  });
}
