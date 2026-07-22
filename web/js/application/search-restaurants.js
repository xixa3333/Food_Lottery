import { filterPlaces, validateCriteria } from "../domain/search.js?v=20260722-1";

export async function searchRestaurants(request, dependencies) {
  const validationError = validateCriteria(request.criteria, dependencies.limits);
  if (validationError) throw new Error(validationError);
  if (!request.currentLocation && !request.locationText.trim()) throw new Error("請允許定位，或手動輸入位置。");

  const usesDeviceLocation = Boolean(request.currentLocation && request.locationText.trim() === request.detectedLabel);
  const resolved = usesDeviceLocation
    ? { center: request.currentLocation, label: request.detectedLabel }
    : await dependencies.places.resolveLocation(request.locationText.trim());

  const places = await dependencies.places.searchRestaurants({
    center: resolved.center,
    radius: Number(request.criteria.radius),
    keyword: request.keyword.trim()
  });
  const accuracy = usesDeviceLocation ? Math.ceil(Math.max(0, Number(request.locationAccuracy) || 0)) : 0;
  const matches = filterPlaces(places, resolved.center, request.criteria, accuracy);
  if (!matches.length) {
    throw new Error(`在 ${request.criteria.radius} 公尺範圍內找不到符合條件的餐廳，請降低評分、清空關鍵字或加大半徑。`);
  }
  const index = Math.min(matches.length - 1, Math.floor(dependencies.random() * matches.length));
  return { ...matches[index], count: matches.length, centerLabel: resolved.label, accuracyAllowance: accuracy };
}
