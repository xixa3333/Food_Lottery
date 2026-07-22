import { coordinatesOf } from "../domain/search.js?v=20260722-5";

export function buildSearchAreas(center, radius) {
  const count = radius <= 500 ? 5 : radius <= 1000 ? 9 : 16;
  const offsets = count === 5
    ? [[.5, 0], [-.5, 0], [0, .5], [0, -.5]]
    : (count === 9 ? [-.6, 0, .6] : [-.75, -.25, .25, .75])
      .flatMap((y) => (count === 9 ? [-.6, 0, .6] : [-.75, -.25, .25, .75]).map((x) => [x, y]))
      .filter(([x, y]) => x !== 0 || y !== 0)
      .sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2)
      .slice(0, count - 1);
  const pattern = [[0, 0], ...offsets];
  const cellRadius = radius * (radius <= 500 ? .65 : radius <= 1000 ? .5 : .4);
  const latScale = 1 / 111320;
  const lngScale = 1 / (111320 * Math.max(.1, Math.cos(center.lat * Math.PI / 180)));
  return pattern.map(([x, y]) => ({
    center: { lat: center.lat + y * radius * latScale, lng: center.lng + x * radius * lngScale },
    radius: Math.max(100, Math.round(cellRadius))
  }));
}

function placeKey(place) {
  const point = coordinatesOf(place.location);
  return place.id || `${place.displayName || ""}|${point?.lat || ""}|${point?.lng || ""}`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export class GooglePlacesService {
  constructor({ loader, apiKeyProvider, usageStore }) {
    this.loader = loader;
    this.apiKeyProvider = apiKeyProvider;
    this.usageStore = usageStore;
  }

  async library() {
    const maps = await this.loader.load(this.apiKeyProvider());
    return maps.importLibrary("places");
  }

  async resolveLocation(query) {
    const { Place } = await this.library();
    this.usageStore.increment();
    const { places } = await Place.searchByText({
      textQuery: query,
      fields: ["displayName", "formattedAddress", "location"],
      maxResultCount: 1,
      language: "zh-TW",
      region: "TW"
    });
    const match = places[0];
    const center = coordinatesOf(match?.location);
    if (!center) throw new Error(`找不到位置：${query}`);
    return { center, label: match.formattedAddress || match.displayName || query };
  }

  async searchRestaurants({ center, radius, keyword, selectedTypes = [] }) {
    const { Place, SearchNearbyRankPreference, SearchByTextRankPreference } = await this.library();
    const fields = ["id", "displayName", "location", "rating", "priceLevel", "googleMapsURI", "primaryType", "types", "primaryTypeDisplayName", "businessStatus", "currentOpeningHours", "utcOffsetMinutes"];
    const searchArea = async (area, typeBatch = []) => {
      this.usageStore.increment();
      if (keyword) {
      const { places } = await Place.searchByText({
        textQuery: `${keyword} 餐廳`,
        fields,
        // Text Search 在部分 Maps JavaScript API 版本會拒絕圓形
        // locationRestriction；用官方支援的圓形 locationBias，並由 domain
        // 層再次計算距離，確保超出半徑的結果不會顯示。
        locationBias: area,
        maxResultCount: 20,
        rankPreference: SearchByTextRankPreference.RELEVANCE,
        language: "zh-TW",
        region: "TW"
      });
      return places;
      }
      const { places } = await Place.searchNearby({
      fields,
      locationRestriction: area,
      includedTypes: typeBatch,
      maxResultCount: 20,
      rankPreference: SearchNearbyRankPreference.POPULARITY,
      language: "zh-TW",
      region: "TW"
    });
      return places;
    };

    const areas = buildSearchAreas(center, radius);
    const effectiveTypes = selectedTypes.length ? selectedTypes : ["restaurant", "cafe", "bakery", "meal_takeaway"];
    const typeBatches = keyword ? [[]] : chunks(effectiveTypes, 50);
    const batches = [];
    for (const typeBatch of typeBatches) {
      const first = await searchArea({ center, radius }, typeBatch);
      batches.push(first);
      // Google 每批最多 20 筆；只有首批滿載時才啟動分區。
      if (first.length >= 20) {
        for (const area of areas.slice(1)) batches.push(await searchArea(area, typeBatch));
      }
    }
    return [...new Map(batches.flat().map((place) => [placeKey(place), place])).values()];
  }
}
