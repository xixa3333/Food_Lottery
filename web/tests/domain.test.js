import test from "node:test";
import assert from "node:assert/strict";
import { coordinatesOf, distanceMeters, filterPlaces, openingStatus, priceValue, validateCriteria } from "../js/domain/search.js";
import { SEARCH_LIMITS } from "../js/config.js";

test("coordinates and price representations are normalized", () => {
  assert.deepEqual(coordinatesOf({ lat: () => 25, lng: () => 121 }), { lat: 25, lng: 121 });
  assert.equal(coordinatesOf({ lat: "x", lng: 121 }), null);
  assert.equal(priceValue("PRICE_LEVEL_MODERATE"), 2);
  assert.equal(priceValue(undefined), null);
});

test("distance uses meters and honors hard boundary", () => {
  const center = { lat: 25, lng: 121 };
  const hours = { businessStatus: "OPERATIONAL", utcOffsetMinutes: 480, currentOpeningHours: { periods: [{ open: { day: 0, hour: 0 } }] } };
  const near = { ...hours, displayName: "near", location: { lat: 25.001, lng: 121 }, rating: 5 };
  const far = { ...hours, displayName: "far", location: { lat: 25.02, lng: 121 }, rating: 5 };
  assert.ok(distanceMeters(center, near.location) > 100 && distanceMeters(center, near.location) < 115);
  const result = filterPlaces([near, far], center, { radius: 100, minRating: 0, minPrice: 0, maxPrice: 4 }, 15);
  assert.deepEqual(result.map(({ place }) => place.displayName), ["near"]);
});

test("filter applies rating, price, unknown-price and invalid-location edges", () => {
  const center = { lat: 25, lng: 121 };
  const base = { location: center, rating: 4.6, businessStatus: "OPERATIONAL", utcOffsetMinutes: 480, currentOpeningHours: { periods: [{ open: { day: 0, hour: 0 } }] } };
  const places = [{ ...base, displayName: "ok", priceLevel: "MODERATE" }, { ...base, displayName: "unknown" }, { ...base, displayName: "low", rating: 3 }, { displayName: "bad" }];
  const criteria = { radius: 100, minRating: 4, minPrice: 1, maxPrice: 3, includeUnknownPrice: false };
  assert.deepEqual(filterPlaces(places, center, criteria).map(({ place }) => place.displayName), ["ok"]);
  assert.deepEqual(filterPlaces(places, center, { ...criteria, includeUnknownPrice: true }).map(({ place }) => place.displayName), ["ok", "unknown"]);
});

test("opening status covers open, closing soon, closed, unknown, and overnight", () => {
  const mondayTaipei = new Date("2026-07-20T12:00:00Z"); // 台北週一 20:00
  const place = (periods, extra = {}) => ({ businessStatus: "OPERATIONAL", utcOffsetMinutes: 480, currentOpeningHours: { periods }, ...extra });
  assert.equal(openingStatus(place([{ open: { day: 1, hour: 18 }, close: { day: 1, hour: 22 } }]), mondayTaipei).type, "open");
  assert.equal(openingStatus(place([{ open: { day: 1, hour: 18 }, close: { day: 1, hour: 20, minute: 20 } }]), mondayTaipei).type, "closingSoon");
  assert.equal(openingStatus(place([{ open: { day: 1, hour: 9 }, close: { day: 1, hour: 17 } }]), mondayTaipei).type, "closed");
  assert.equal(openingStatus({ businessStatus: "OPERATIONAL" }, mondayTaipei).type, "unknown");
  assert.equal(openingStatus({ businessStatus: "CLOSED_TEMPORARILY" }, mondayTaipei).type, "closed");
  const tuesdayEarly = new Date("2026-07-20T17:00:00Z"); // 台北週二 01:00
  assert.equal(openingStatus(place([{ open: { day: 1, hour: 22 }, close: { day: 2, hour: 2 } }]), tuesdayEarly).type, "open");
});

test("opening checkboxes independently opt into exceptional statuses", () => {
  const now = new Date("2026-07-20T12:00:00Z");
  const base = { location: { lat: 25, lng: 121 }, rating: 5, businessStatus: "OPERATIONAL", utcOffsetMinutes: 480 };
  const open = { ...base, displayName: "open", currentOpeningHours: { periods: [{ open: { day: 1, hour: 18 }, close: { day: 1, hour: 22 } }] } };
  const soon = { ...base, displayName: "soon", currentOpeningHours: { periods: [{ open: { day: 1, hour: 18 }, close: { day: 1, hour: 20, minute: 10 } }] } };
  const closed = { ...base, displayName: "closed", currentOpeningHours: { periods: [] } };
  const unknown = { ...base, displayName: "unknown", currentOpeningHours: undefined };
  const criteria = { radius: 100, minRating: 0, minPrice: 0, maxPrice: 4 };
  assert.deepEqual(filterPlaces([open, soon, closed, unknown], base.location, criteria, 0, now).map(x => x.place.displayName), ["open"]);
  const all = { ...criteria, includeClosingSoon: true, includeClosed: true, includeUnknownHours: true };
  assert.deepEqual(filterPlaces([open, soon, closed, unknown], base.location, all, 0, now).map(x => x.place.displayName), ["open", "soon", "closed", "unknown"]);
});

test("criteria validation covers range and ordering", () => {
  assert.equal(validateCriteria({ radius: 100, minRating: 4, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), null);
  assert.match(validateCriteria({ radius: 99, minRating: 4, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), /半徑/);
  assert.match(validateCriteria({ radius: 100, minRating: 6, minPrice: 1, maxPrice: 3 }, SEARCH_LIMITS), /評分/);
  assert.match(validateCriteria({ radius: 100, minRating: 4, minPrice: 4, maxPrice: 1 }, SEARCH_LIMITS), /最低價位/);
});
