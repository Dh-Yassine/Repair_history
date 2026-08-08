import crypto from 'crypto';

export function generateShareToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function normalizeShareLevel(value, fallback = 'FULL') {
  if (value === 'NONE' || value === 'SUMMARY' || value === 'FULL') return value;
  return fallback;
}

/**
 * Weighted trust score.
 *
 * Each event contributes weight = typeWeight × recencyFactor:
 * - typeWeight: major mechanical work counts 3, routine service 2, minor/cosmetic 1.
 * - recencyFactor: exponential decay with a 24-month half-life, floored at 0.25
 *   so old verified history never becomes worthless.
 *
 * Score = 100 × (weighted verified) / (weighted total). A verified brake job
 * last month therefore moves the score far more than a verified oil change
 * from three years ago.
 */
const MAJOR_TYPES = /brake|timing|transmission|engine|clutch|suspension|gearbox|turbo|head gasket|injector|embrayage|frein|moteur|distribution/i;
const MINOR_TYPES = /wiper|bulb|wash|detail|cosmetic|accessor|essuie|ampoule|lavage/i;

export function eventTypeWeight(eventType) {
  const t = String(eventType || '');
  if (MAJOR_TYPES.test(t)) return 3;
  if (MINOR_TYPES.test(t)) return 1;
  return 2;
}

export function eventRecencyFactor(eventDate, now = new Date()) {
  const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
  if (Number.isNaN(date.getTime())) return 0.25;
  const ageMonths = Math.max(0, (now - date) / (1000 * 60 * 60 * 24 * 30.44));
  return Math.max(0.25, Math.pow(0.5, ageMonths / 24));
}

export function computeTrustScore(events, now = new Date()) {
  if (!events || events.length === 0) return 0;
  let weightedTotal = 0;
  let weightedVerified = 0;
  for (const e of events) {
    const w = eventTypeWeight(e.eventType) * eventRecencyFactor(e.date, now);
    weightedTotal += w;
    if (e.verified) weightedVerified += w;
  }
  if (weightedTotal === 0) return 0;
  return Math.round((weightedVerified / weightedTotal) * 100);
}

export function canAccessPublic(vehicle, { partnerKey } = {}) {
  if (!vehicle.shareToken || vehicle.shareLevel === 'NONE') {
    return { allowed: false, reason: 'disabled' };
  }
  if (vehicle.visibility === 'PARTNER_ONLY') {
    const expected = process.env.PARTNER_API_KEY;
    if (!expected || partnerKey !== expected) {
      return { allowed: false, reason: 'partner_key_required' };
    }
  }
  // PRIVATE and PUBLIC: anyone with the secret link can view (difference is what data is shown)
  return { allowed: true, reason: null };
}

/** Labels + rules exposed to the buyer page so settings are visible in the UI */
export function publicShareMeta(vehicle) {
  const isSummary = vehicle.shareLevel === 'SUMMARY';
  const isFull = vehicle.shareLevel === 'FULL';
  const visibility = vehicle.visibility;

  const accessLabel =
    visibility === 'PARTNER_ONLY'
      ? 'Partner access'
      : visibility === 'PUBLIC'
        ? 'Public listing'
        : 'Private link';

  const detailLabel = isSummary ? 'History summary' : isFull ? 'Full history' : 'Hidden';

  return {
    visibility,
    shareLevel: vehicle.shareLevel,
    accessLabel,
    detailLabel,
    showVin: isFull || visibility === 'PUBLIC',
    showSerialNumber: isFull || visibility === 'PUBLIC',
    showGarageDetails: isFull,
    showNotes: isFull,
    showCosts: isFull,
    showShopAttribution: isFull,
    showProofCounts: isFull,
    description: isSummary
      ? 'Dates, mileage, service types, and verification status only.'
      : 'Includes garage names, costs, notes, shop verification details, and proof counts.',
    accessDescription:
      visibility === 'PARTNER_ONLY'
        ? 'Opened with a valid partner key (insurer, dealer, or integration).'
        : visibility === 'PUBLIC'
          ? 'Intended for classified ads and listings — VIN visible even in summary mode.'
          : 'Unlisted — only people you send the link to can open this page.',
  };
}

export function sanitizeVehiclePublic(vehicle) {
  const meta = publicShareMeta(vehicle);
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
    vin: meta.showVin ? vehicle.vin : null,
    serialNumber: meta.showSerialNumber ? vehicle.serialNumber : null,
    visibility: vehicle.visibility,
    shareLevel: vehicle.shareLevel,
    verifiedCount: vehicle.events?.filter((e) => e.verified).length ?? 0,
    totalEvents: vehicle.events?.length ?? 0,
    hasPhoto: Boolean(vehicle.photoPath),
  };
}

export function sanitizeEventPublic(event, shareLevel) {
  const base = {
    id: event.id,
    eventType: event.eventType,
    date: event.date,
    mileage: event.mileage,
    verified: event.verified,
    source: event.source,
  };
  if (shareLevel === 'SUMMARY') return base;
  if (shareLevel !== 'FULL') return base;
  return {
    ...base,
    cost: event.cost ?? null,
    garageName: event.garageName ?? null,
    notes: event.notes ?? null,
    documentCount: event.documents?.length ?? 0,
    createdByShop: event.createdByShop
      ? {
          id: event.createdByShop.id,
          shopName: event.createdByShop.shopName,
          fullName: event.createdByShop.fullName,
        }
      : null,
    verification: event.verification
      ? {
          status: event.verification.status,
          verifiedAt: event.verification.verifiedAt,
          notes: event.verification.notes,
          shop: event.verification.shop
            ? {
                id: event.verification.shop.id,
                shopName: event.verification.shop.shopName,
                fullName: event.verification.shop.fullName,
              }
            : null,
        }
      : null,
  };
}

export function buildEmbedSnippet(baseUrl, shareToken, isAnimated, appBase = 'http://localhost:5173') {
  const scriptUrl = `${baseUrl}/badge/embed.js`;
  const safeToken = shareToken.replace(/"/g, '');
  const safeAppBase = appBase.replace(/"/g, '');
  return `<!-- AutoHistory Trust Badge -->
<div class="autohistory-badge" data-token="${safeToken}" data-animated="${isAnimated}"></div>
<script async src="${scriptUrl}" data-token="${safeToken}" data-animated="${isAnimated}" data-app-base="${safeAppBase}"></script>`;
}
