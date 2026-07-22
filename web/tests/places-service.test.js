import test from "node:test";
import assert from "node:assert/strict";
import { GooglePlacesService } from "../js/services/places-service.js";

function serviceWith(placeApi) {
  let count = 0;
  const loader = { load: async key => (assert.equal(key, "key"), { importLibrary: async name => (assert.equal(name, "places"), placeApi) }) };
  return { service: new GooglePlacesService({ loader, apiKeyProvider: () => "key", usageStore: { increment: () => count++ } }), count: () => count };
}

test("manual address uses Place.searchByText, never Geocoder", async () => {
  let request;
  const { service, count } = serviceWith({ Place: { searchByText: async r => (request = r, { places: [{ formattedAddress: "台北", location: { lat: 25, lng: 121 } }] }) } });
  const result = await service.resolveLocation("探海有限公司");
  assert.equal(request.textQuery, "探海有限公司");
  assert.deepEqual(result.center, { lat: 25, lng: 121 });
  assert.equal(count(), 1);
});

test("keyword and nearby searches choose their Places API methods", async () => {
  const requests = [];
  const api = { Place: { searchByText: async r => (requests.push(["text", r]), { places: [] }), searchNearby: async r => (requests.push(["near", r]), { places: [] }) }, SearchNearbyRankPreference: { POPULARITY: "p" }, SearchByTextRankPreference: { RELEVANCE: "r" } };
  const { service, count } = serviceWith(api);
  await service.searchRestaurants({ center: { lat: 25, lng: 121 }, radius: 100, keyword: "牛肉麵" });
  await service.searchRestaurants({ center: { lat: 25, lng: 121 }, radius: 100, keyword: "" });
  assert.deepEqual(requests.map(x => x[0]), ["text", "near"]);
  assert.equal(requests[0][1].locationBias.radius, 100);
  assert.equal(requests[0][1].locationRestriction, undefined);
  assert.ok(requests[0][1].fields.includes("currentOpeningHours"));
  assert.ok(requests[0][1].fields.includes("utcOffsetMinutes"));
  assert.equal(count(), 2);
});
