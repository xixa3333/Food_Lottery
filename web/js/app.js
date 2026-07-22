import { APP_VERSION, SEARCH_LIMITS, STORAGE_KEYS } from "./config.js?v=20260722-5";
import { pickCandidate, searchRestaurants } from "./application/search-restaurants.js?v=20260722-5";
import { ApiKeyStore } from "./services/key-store.js?v=20260722-5";
import { UsageStore } from "./services/usage-store.js?v=20260722-5";
import { BrowserLocationService } from "./services/location-service.js?v=20260722-5";
import { GoogleMapsLoader } from "./services/google-maps-loader.js?v=20260722-5";
import { GooglePlacesService } from "./services/places-service.js?v=20260722-5";
import { friendlyError } from "./ui/errors.js?v=20260722-5";
import { AppView } from "./ui/view.js?v=20260722-5";

const view = new AppView(document);
const keyStore = new ApiKeyStore({ sessionStorage, localStorage, key: STORAGE_KEYS.apiKey });
const usageStore = new UsageStore({ storage: localStorage, key: STORAGE_KEYS.usage });
const loader = new GoogleMapsLoader({ window, document });
const places = new GooglePlacesService({ loader, apiKeyProvider: () => keyStore.read(), usageStore });
const locationService = new BrowserLocationService(navigator.geolocation);
const state = { coordinates: null, accuracy: 0, detectedLabel: "", candidates: [], resultContext: null, selectedId: null };

function renderUsage() {
  const limit = Math.max(1, Number(view.byId("usageLimit").value) || 1000);
  view.renderUsage(usageStore.read(), limit, usageStore.nextReset());
}

async function locate() {
  view.setStatus("正在取得目前位置…");
  try {
    const result = await locationService.locate();
    state.coordinates = result.coordinates;
    state.accuracy = result.accuracy;
    state.detectedLabel = "目前位置";
    view.byId("location").value = state.detectedLabel;
    view.setStatus(`定位成功（精確度約 ${Math.round(result.accuracy)} 公尺）`);
  } catch (error) {
    state.coordinates = null;
    state.accuracy = 0;
    view.setStatus(friendlyError(error));
    view.byId("location").focus();
  }
}

async function applyKey() {
  try {
    keyStore.save(view.byId("apiKey").value, view.byId("rememberKey").checked);
    await loader.load(keyStore.read());
    view.setStatus("API key 已套用，可以開始搜尋。");
  } catch (error) {
    view.setStatus(friendlyError(error));
  }
}

async function search() {
  if (!keyStore.read()) {
    view.setStatus("請先輸入並套用自己的 Google Maps API key。");
    view.byId("apiKey").focus();
    return;
  }
  const request = view.readSearchRequest(state);
  if (!request.criteria.selectedTypes.length) {
    view.setStatus("請至少選擇一種餐飲類型。");
    return;
  }
  state.candidates = [];
  state.resultContext = null;
  state.selectedId = null;
  view.byId("reroll").hidden = true;
  view.setBusy(true);
  view.setStatus("正在使用 Google Places 搜尋附近餐廳…");
  const usageBefore = usageStore.read().places;
  try {
    const result = await searchRestaurants(request, { places, limits: SEARCH_LIMITS, random: Math.random });
    state.candidates = result.candidates;
    state.resultContext = { count: result.count, centerLabel: result.centerLabel, accuracyAllowance: result.accuracyAllowance };
    state.selectedId = result.place.id || null;
    view.renderResult(result);
    const note = result.accuracyAllowance ? `（已計入定位誤差約 ${result.accuracyAllowance} 公尺）` : "";
    const requestCount = usageStore.read().places - usageBefore;
    view.setStatus(`嚴格範圍內找到 ${result.count} 間符合條件的餐廳${note}；本次使用 ${requestCount} 次 Places 請求。`);
  } catch (error) {
    view.setStatus(friendlyError(error));
  } finally {
    view.setBusy(false);
    renderUsage();
  }
}

function reroll() {
  if (!state.candidates.length) return;
  const selection = pickCandidate(state.candidates, Math.random, state.selectedId);
  state.selectedId = selection.place.id || null;
  view.renderResult({ ...selection, ...state.resultContext });
  view.setStatus(`已從既有 ${state.candidates.length} 間候選餐廳重抽，沒有新增 API 請求。`);
}

function selectSuggestion(button) {
  const selected = button.getAttribute("aria-pressed") === "true";
  document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  view.byId("keyword").value = selected ? "" : button.dataset.keyword;
  button.setAttribute("aria-pressed", String(!selected));
  if (!selected) view.byId("keyword").focus();
}

view.byId("applyKey").addEventListener("click", applyKey);
view.byId("locate").addEventListener("click", locate);
view.byId("search").addEventListener("click", search);
view.byId("reroll").addEventListener("click", reroll);
view.byId("usageLimit").addEventListener("change", () => {
  localStorage.setItem(STORAGE_KEYS.usageLimit, view.byId("usageLimit").value);
  renderUsage();
});
view.byId("location").addEventListener("input", () => {
  if (view.byId("location").value.trim() !== state.detectedLabel) state.coordinates = null;
});
view.byId("keyword").addEventListener("input", () => {
  document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.keyword === view.byId("keyword").value.trim())));
});
document.querySelectorAll(".chip").forEach((button) => button.addEventListener("click", () => selectSuggestion(button)));
view.byId("typeSearch").addEventListener("input", (event) => view.filterTypeOptions(event.target.value));
view.byId("typesAll").addEventListener("click", () => view.setTypeSelection("all"));
view.byId("typesPopular").addEventListener("click", () => view.setTypeSelection("popular"));
view.byId("typesClear").addEventListener("click", () => view.setTypeSelection("clear"));
view.byId("typeList").addEventListener("change", () => view.updateTypeCount());

view.byId("apiKey").value = keyStore.read();
view.renderTypeSelector();
view.byId("rememberKey").checked = keyStore.isRemembered();
view.byId("usageLimit").value = localStorage.getItem(STORAGE_KEYS.usageLimit) || "1000";
view.byId("appVersion").textContent = `版本 ${APP_VERSION}`;
renderUsage();
locate();
