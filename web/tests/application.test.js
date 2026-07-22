import test from "node:test";
import assert from "node:assert/strict";
import { searchRestaurants } from "../js/application/search-restaurants.js";

const limits = { minRadius: 100, maxRadius: 50000, minRating: 0, maxRating: 5 };
const criteria = { radius: 100, minRating: 0, minPrice: 0, maxPrice: 4 };
const openHours = { businessStatus: "OPERATIONAL", utcOffsetMinutes: 480, currentOpeningHours: { periods: [{ open: { day: 0, hour: 0 } }] } };

test("manual location resolves through Places service and selects eligible result", async () => {
  const calls = [];
  const places = { resolveLocation: async q => (calls.push(q), { center: { lat: 25, lng: 121 }, label: q }), searchRestaurants: async () => [{ ...openHours, displayName: "店", location: { lat: 25, lng: 121 } }] };
  const result = await searchRestaurants({ locationText: "探海有限公司", keyword: "", criteria }, { places, limits, random: () => 0 });
  assert.equal(result.place.displayName, "店");
  assert.deepEqual(calls, ["探海有限公司"]);
});

test("device location skips manual resolver and adds bounded accuracy", async () => {
  let resolved = false;
  const places = { resolveLocation: async () => (resolved = true), searchRestaurants: async () => [{ ...openHours, displayName: "店", location: { lat: 25.001, lng: 121 } }] };
  const result = await searchRestaurants({ currentLocation: { lat: 25, lng: 121 }, locationText: "目前位置", detectedLabel: "目前位置", locationAccuracy: 15, keyword: "", criteria }, { places, limits, random: () => 0 });
  assert.equal(resolved, false);
  assert.equal(result.count, 1);
});

test("missing location and empty result are explicit errors", async () => {
  await assert.rejects(searchRestaurants({ locationText: "", keyword: "", criteria }, { places: {}, limits, random: Math.random }), /位置/);
  const places = { resolveLocation: async () => ({ center: { lat: 25, lng: 121 } }), searchRestaurants: async () => [] };
  await assert.rejects(searchRestaurants({ locationText: "台北", keyword: "", criteria }, { places, limits, random: Math.random }), /找不到符合/);
});
