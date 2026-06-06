import { Router } from 'express';

const router = Router();

router.get('/:vin', async (req, res) => {
  try {
    const vin = req.params.vin?.trim().toUpperCase();
    if (!vin || vin.length < 11) {
      return res.status(400).json({ error: 'Valid VIN required (11+ characters)' });
    }

    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: 'VIN lookup service unavailable' });
    }

    const data = await response.json();
    const results = data.Results || [];
    const get = (variable) => results.find((r) => r.Variable === variable)?.Value;

    const make = get('Make');
    const model = get('Model');
    const yearRaw = get('Model Year');

    if (!make || make === 'Not Applicable') {
      return res.status(404).json({ error: 'Could not decode VIN' });
    }

    res.json({
      vin,
      make,
      model: model && model !== 'Not Applicable' ? model : '',
      year: yearRaw && yearRaw !== 'Not Applicable' ? parseInt(yearRaw, 10) : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'VIN decode failed' });
  }
});

export default router;
