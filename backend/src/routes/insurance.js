import { Router } from 'express';
import { getAnonymizedReliabilityData } from '../lib/insurance.js';

const router = Router();

function requirePartnerKey(req, res, next) {
  const key = req.headers['x-partner-key'] || req.query.partnerKey;
  const expected = process.env.PARTNER_API_KEY || process.env.INSURANCE_API_KEY;
  if (!expected || key !== expected) {
    return res.status(403).json({ error: 'Insurance partner API key required' });
  }
  next();
}

router.get('/reliability', requirePartnerKey, async (_req, res) => {
  const data = await getAnonymizedReliabilityData();
  res.json({ insights: data });
});

router.get('/reliability/summary', requirePartnerKey, async (_req, res) => {
  const data = await getAnonymizedReliabilityData();
  res.json({
    fleetSize: data.fleetSize,
    platformVerificationRate: data.platformVerificationRate,
    topMakes: data.byManufacturer.slice(0, 5),
    disclaimer: data.disclaimer,
  });
});

export default router;
