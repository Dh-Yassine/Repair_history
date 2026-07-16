/**
 * Data-integrity validators for AutoHistory.
 * All return { error: string } on failure, or null when valid.
 * Error strings are safe to show directly in the UI.
 */

export function formatKm(n) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Mileage must be a valid non-negative number (no “must be ≥ current odometer” rule). */
export function assertMileageNotBelowVehicle(proposedMileage, _vehicleMileage) {
  const proposed = Number(proposedMileage);
  if (Number.isNaN(proposed) || proposed < 0) {
    return { error: 'Mileage must be a valid number of kilometres.' };
  }
  return null;
}

/** Event date: not in the future, not before Jan 1 of the vehicle model year. */
export function assertEventDate(dateInput, vehicleYear) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Event date must be a valid date.' };
  }

  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (date > endOfToday) {
    return { error: 'Event date cannot be in the future.' };
  }

  const year = Number(vehicleYear);
  if (!Number.isNaN(year) && year > 0) {
    const minDate = new Date(year, 0, 1, 0, 0, 0, 0);
    if (date < minDate) {
      return {
        error: `Event date cannot be before the vehicle's model year (${year}).`,
      };
    }
  }
  return null;
}

/**
 * VIN once set cannot be cleared. Changing to a different non-empty VIN is allowed
 * (admin-audited correction flow can use the same rule). Blanking is rejected.
 */
export function assertVinNotCleared(existingVin, incomingVin) {
  if (!existingVin) return null;
  const next = incomingVin === undefined || incomingVin === null
    ? ''
    : String(incomingVin).trim();
  if (next === '') {
    return { error: 'VIN cannot be removed once it has been set.' };
  }
  return null;
}

export function normalizeVin(vin) {
  if (vin === undefined || vin === null || String(vin).trim() === '') return null;
  return String(vin).trim().toUpperCase();
}

/** Global VIN uniqueness (exclude current vehicle id when updating). */
export async function assertVinUnique(prisma, vin, excludeVehicleId = null) {
  const normalized = normalizeVin(vin);
  if (!normalized) return null;

  const clash = await prisma.vehicle.findFirst({
    where: {
      vin: normalized,
      ...(excludeVehicleId ? { id: { not: excludeVehicleId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return { error: 'This VIN is already registered.' };
  }
  return null;
}

/** Shop must not create/verify events on a vehicle they own (same user id). */
export function assertNoShopSelfService(shopUserId, vehicleOwnerId) {
  if (shopUserId && vehicleOwnerId && shopUserId === vehicleOwnerId) {
    return {
      error: 'You cannot create or verify service records on a vehicle you own.',
    };
  }
  return null;
}

export function canHardDeleteVehicle(vehicle, eventCount) {
  return eventCount === 0 && !vehicle.shareEverEnabled && !vehicle.shareToken;
}
