const PRICE_VALUES = Object.freeze({ FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 });

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

export function filterPlaces(places, center, criteria, accuracyAllowance = 0) {
  const radius = Number(criteria.radius);
  const maximumDistance = radius + Math.max(0, Number(accuracyAllowance) || 0);
  const minRating = Number(criteria.minRating);
  const minPrice = Number(criteria.minPrice);
  const maxPrice = Number(criteria.maxPrice);
  const priceFilterActive = minPrice > 0 || maxPrice < 4;

  return places
    .map((place) => ({ place, distance: distanceMeters(center, place.location) }))
    .filter(({ place, distance }) => {
      if (distance === null || distance > maximumDistance) return false;
      if (minRating > 0 && !(Number(place.rating) >= minRating)) return false;
      if (!priceFilterActive) return true;
      const price = priceValue(place.priceLevel);
      return price === null ? Boolean(criteria.includeUnknownPrice) : price >= minPrice && price <= maxPrice;
    });
}
