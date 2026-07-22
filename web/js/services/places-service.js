import { coordinatesOf } from "../domain/search.js?v=20260722-3";

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

  async searchRestaurants({ center, radius, keyword }) {
    const { Place, SearchNearbyRankPreference, SearchByTextRankPreference } = await this.library();
    const fields = ["displayName", "location", "rating", "priceLevel", "googleMapsURI", "primaryTypeDisplayName", "businessStatus", "currentOpeningHours", "utcOffsetMinutes"];
    this.usageStore.increment();
    if (keyword) {
      const { places } = await Place.searchByText({
        textQuery: `${keyword} 餐廳`,
        fields,
        // Text Search 在部分 Maps JavaScript API 版本會拒絕圓形
        // locationRestriction；用官方支援的圓形 locationBias，並由 domain
        // 層再次計算距離，確保超出半徑的結果不會顯示。
        locationBias: { center, radius },
        includedType: "restaurant",
        maxResultCount: 20,
        rankPreference: SearchByTextRankPreference.RELEVANCE,
        language: "zh-TW",
        region: "TW"
      });
      return places;
    }
    const { places } = await Place.searchNearby({
      fields,
      locationRestriction: { center, radius },
      includedPrimaryTypes: ["restaurant", "cafe", "bakery", "meal_takeaway"],
      maxResultCount: 20,
      rankPreference: SearchNearbyRankPreference.POPULARITY,
      language: "zh-TW",
      region: "TW"
    });
    return places;
  }
}
