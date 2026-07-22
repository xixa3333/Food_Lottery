const PRICE_VALUES = Object.freeze({ FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 });
export const CLOSING_SOON_MINUTES = 30;

export function priceValue(level) {
  if (level === undefined || level === null || level === "") return null;
  if (Number.isInteger(level) && level >= 0 && level <= 4) return level;
  const normalized = String(level).replace("PRICE_LEVEL_", "");
  return Object.hasOwn(PRICE_VALUES, normalized) ? PRICE_VALUES[normalized] : null;
}

export function coordinatesOf(location) {
  if (!location) return null;
  const lat = typeof location.lat === "function" ? location.lat() : Number(location.lat);
  const lng = typeof location.lng === "function" ? location.lng() : Number(location.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function distanceMeters(center, location) {
  const origin = coordinatesOf(center);
  const target = coordinatesOf(location);
  if (!origin || !target) return null;
  const radians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = radians(target.lat - origin.lat);
  const deltaLng = radians(target.lng - origin.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(origin.lat)) * Math.cos(radians(target.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateCriteria(criteria, limits) {
  const rating = Number(criteria.minRating);
  const radius = Number(criteria.radius);
  const minPrice = Number(criteria.minPrice);
  const maxPrice = Number(criteria.maxPrice);
  if (!Number.isFinite(rating) || rating < limits.minRating || rating > limits.maxRating) {
    return "評分須為 0–5。";
  }
  if (!Number.isInteger(radius) || radius < limits.minRadius || radius > limits.maxRadius) {
    return `半徑須為 ${limits.minRadius}–${limits.maxRadius} 公尺。`;
  }
  if (![minPrice, maxPrice].every((value) => Number.isInteger(value) && value >= 0 && value <= 4)) {
    return "價位條件無效。";
  }
  if (minPrice > maxPrice) return "最低價位不能高於最高價位。";
  return null;
}

function pointMinutes(point) {
  return Number(point.day) * 1440 + Number(point.hour) * 60 + Number(point.minute || 0);
}

export function openingStatus(place, now = new Date()) {
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return { type: "closed", label: "休息／停止營業" };
  const periods = place.currentOpeningHours?.periods;
  if (!Array.isArray(periods) || !Number.isFinite(Number(place.utcOffsetMinutes))) return { type: "unknown", label: "無法確認營業狀態" };
  const local = new Date(now.getTime() + Number(place.utcOffsetMinutes) * 60000);
  const current = local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();
  for (const period of periods) {
    if (!period?.open) continue;
    const open = pointMinutes(period.open);
    if (!period.close) return { type: "open", label: "營業中（24 小時）" };
    let close = pointMinutes(period.close);
    if (close <= open) close += 10080;
    for (const minute of [current, current + 10080]) {
      if (minute >= open && minute < close) {
        const remaining = close - minute;
        return remaining <= CLOSING_SOON_MINUTES
          ? { type: "closingSoon", label: `即將打烊（約 ${remaining} 分鐘）`, minutesUntilClose: remaining }
          : { type: "open", label: "營業中", minutesUntilClose: remaining };
      }
    }
  }
  return { type: "closed", label: "目前休息／已打烊" };
}

export function filterPlaces(places, center, criteria, accuracyAllowance = 0, now = new Date()) {
  const radius = Number(criteria.radius);
  const maximumDistance = radius + Math.max(0, Number(accuracyAllowance) || 0);
  const minRating = Number(criteria.minRating);
  const minPrice = Number(criteria.minPrice);
  const maxPrice = Number(criteria.maxPrice);
  const priceFilterActive = minPrice > 0 || maxPrice < 4;
  const selectedTypes = new Set(criteria.selectedTypes || []);

  return places
    .map((place) => ({ place, distance: distanceMeters(center, place.location), opening: openingStatus(place, now) }))
    .filter(({ place, distance, opening }) => {
      if (distance === null || distance > maximumDistance) return false;
      if (minRating > 0 && !(Number(place.rating) >= minRating)) return false;
      if (opening.type === "closingSoon" && !criteria.includeClosingSoon) return false;
      if (opening.type === "closed" && !criteria.includeClosed) return false;
      if (opening.type === "unknown" && !criteria.includeUnknownHours) return false;
      if (selectedTypes.size && ![place.primaryType, ...(place.types || [])].some((type) => selectedTypes.has(type))) return false;
      if (priceFilterActive) {
        const price = priceValue(place.priceLevel);
        if (price === null ? !criteria.includeUnknownPrice : price < minPrice || price > maxPrice) return false;
      }
      return true;
    });
}
