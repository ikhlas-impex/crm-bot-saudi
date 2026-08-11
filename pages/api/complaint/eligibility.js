import eligibleModels from '../../../data/eligible-models.json';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { category, model } = req.body || {};
  const entry = eligibleModels.categories[category];

  if (!entry) {
    return res.status(200).json({ success: true, eligible: false, charge: null });
  }

  // If the model list for this category is still empty (placeholder data not
  // filled in yet), fail open to "eligible" so you're not blocked during
  // testing - tighten this once eligible-models.json has real model codes.
  const listIsEmpty = entry.models.length === 0;
  const eligible = listIsEmpty ? true : entry.models.includes(model);

  return res.status(200).json({
    success: true,
    eligible,
    charge: entry.charge,
    warning: listIsEmpty ? 'eligible-models.json has no models listed for this category yet - eligibility check is not actually filtering.' : undefined,
  });
}
