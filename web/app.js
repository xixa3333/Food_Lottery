const STORAGE_KEY = "foodLotteryGoogleKey";
const USAGE_KEY = "foodLotteryUsage";
const LIMIT_KEY = "foodLotteryUsageLimit";
const state = { coordinates: null, detectedLabel: "", mapsPromise: null };
const PRICE_VALUES = { FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 };
const PRICE_LABELS = ["免費", "$ 便宜", "$$ 中等", "$$$ 昂貴", "$$$$ 非常昂貴"];
const $ = (id) => document.getElementById(id);
const status = (message) => { $("status").textContent = message; };

function monthId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function readUsage() {
  try {
    const value = JSON.parse(localStorage.getItem(USAGE_KEY));
    if (value?.month === monthId()) return { month: value.month, places: Number(value.places) || 0, geocoding: Number(value.geocoding) || 0 };
  } catch (_) { /* Start a clean local counter. */ }
  return { month: monthId(), places: 0, geocoding: 0 };
}

function addUsage(service) {
  const usage = readUsage();
  usage[service] += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  renderUsage();
}

function renderUsage() {
  const usage = readUsage();
  const total = usage.places + usage.geocoding;
  const limit = Math.max(1, Number($("usageLimit").value) || 1000);
  $("usageText").textContent = `本月這台裝置：Places 搜尋 ${usage.places} 次、地址解析 ${usage.geocoding} 次`;
  $("usageBar").style.width = `${Math.min(100, total / limit * 100)}%`;
  const now = new Date();
  const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  $("resetText").textContent = `本機統計將於 ${reset.toLocaleString("zh-TW", { dateStyle: "long", timeStyle: "short" })} 進入新月份。這不是 Google 帳單總量。`;
  if (total >= limit) status(`已達本機警告門檻 ${limit} 次，請先查看 Google 官方用量。`);
}

function currentKey() {
  return $("apiKey").value.trim() || sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || "";
}

function saveAndApplyKey() {
  const key = $("apiKey").value.trim();
  if (!key) { status("請先輸入 Google Maps API key。"); return; }
  sessionStorage.setItem(STORAGE_KEY, key);
  if ($("rememberKey").checked) localStorage.setItem(STORAGE_KEY, key);
  else localStorage.removeItem(STORAGE_KEY);
  state.mapsPromise = null;
  loadGoogleMaps().then(() => status("API key 已套用，可以開始搜尋。"), (error) => status(error.message));
}

function loadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (state.mapsPromise) return state.mapsPromise;
  const key = currentKey();
  if (!key) return Promise.reject(new Error("請先輸入並套用自己的 Google Maps API key。"));
  state.mapsPromise = new Promise((resolve, reject) => {
    const callback = `foodLotteryMapsReady_${Date.now()}`;
    window[callback] = () => { delete window[callback]; resolve(window.google.maps); };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&v=weekly&loading=async&callback=${callback}`;
    script.async = true;
    script.onerror = () => { delete window[callback]; state.mapsPromise = null; reject(new Error("Google Maps 載入失敗，請檢查 API key、API 限制與網域設定。")); };
    document.head.appendChild(script);
  });
  return state.mapsPromise;
}

async function locateDevice() {
  if (!navigator.geolocation) { status("此瀏覽器不支援定位，請手動輸入位置。"); return; }
  status("正在取得目前位置…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.coordinates = { lat: coords.latitude, lng: coords.longitude };
      state.detectedLabel = "目前位置";
      $("location").value = state.detectedLabel;
      status(`定位成功（精確度約 ${Math.round(coords.accuracy)} 公尺）`);
    },
    (error) => {
      state.coordinates = null;
      status(error.code === error.PERMISSION_DENIED
        ? "定位權限已關閉。請在瀏覽器網站設定允許定位後重試，或手動輸入位置。"
        : "暫時無法定位，請重試或手動輸入位置。"
      );
      $("location").focus();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
  );
}

async function geocodeAddress(address) {
  await loadGoogleMaps();
  addUsage("geocoding");
  const geocoder = new google.maps.Geocoder();
  const { results } = await geocoder.geocode({ address, region: "TW", language: "zh-TW" });
  if (!results.length) throw new Error(`找不到位置：${address}`);
  const point = results[0].geometry.location;
  return [{ lat: point.lat(), lng: point.lng() }, results[0].formatted_address];
}

async function searchGooglePlaces(center, radius, keyword) {
  await loadGoogleMaps();
  const { Place, SearchNearbyRankPreference, SearchByTextRankPreference } = await google.maps.importLibrary("places");
  const fields = ["displayName", "location", "rating", "priceLevel", "googleMapsURI", "primaryTypeDisplayName"];
  addUsage("places");
  if (keyword) {
    const { places } = await Place.searchByText({
      textQuery: `${keyword} 餐廳`, fields, locationBias: { center, radius },
      includedType: "restaurant", maxResultCount: 20,
      rankPreference: SearchByTextRankPreference.RELEVANCE, language: "zh-TW", region: "TW"
    });
    return places;
  }
  const { places } = await Place.searchNearby({
    fields, locationRestriction: { center, radius },
    includedPrimaryTypes: ["restaurant", "cafe", "bakery", "meal_takeaway"],
    maxResultCount: 20, rankPreference: SearchNearbyRankPreference.POPULARITY,
    language: "zh-TW", region: "TW"
  });
  return places;
}

async function chooseRestaurant() {
  const button = $("search");
  const locationText = $("location").value.trim();
  const keyword = $("keyword").value.trim();
  const minRating = Number($("rating").value);
  const radius = Number($("radius").value);
  const minPrice = Number($("minPrice").value);
  const maxPrice = Number($("maxPrice").value);
  const includeUnknownPrice = $("includeUnknownPrice").checked;
  if (!currentKey()) { status("請先輸入並套用自己的 Google Maps API key。"); $("apiKey").focus(); return; }
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5 || !Number.isInteger(radius) || radius < 100 || radius > 20000) {
    status("評分須為 0–5，半徑須為 100–20000 公尺。"); return;
  }
  if (minPrice > maxPrice) { status("最低價位不能高於最高價位。"); $("minPrice").focus(); return; }
  if (!state.coordinates && !locationText) { status("請允許定位，或手動輸入位置。"); $("location").focus(); return; }
  button.disabled = true;
  status("正在使用 Google Places 搜尋附近餐廳…");
  try {
    const [center, label] = state.coordinates && locationText === state.detectedLabel
      ? [state.coordinates, state.detectedLabel]
      : await geocodeAddress(locationText);
    const places = await searchGooglePlaces(center, radius, keyword);
    const priceFilterActive = minPrice > 0 || maxPrice < 4;
    const matches = places.filter((place) => {
      if (minRating > 0 && !(Number(place.rating) >= minRating)) return false;
      if (!priceFilterActive) return true;
      const price = priceValue(place.priceLevel);
      return price === null ? includeUnknownPrice : price >= minPrice && price <= maxPrice;
    });
    if (!matches.length) throw new Error("找不到符合條件的餐廳，請降低評分、清空關鍵字或加大半徑。");
    const chosen = matches[Math.floor(Math.random() * matches.length)];
    const category = chosen.primaryTypeDisplayName || "餐廳";
    const rating = Number.isFinite(chosen.rating) ? `${chosen.rating} / 5` : "未提供";
    const price = priceValue(chosen.priceLevel);
    const priceText = price === null ? "未提供" : PRICE_LABELS[price];
    $("result").innerHTML = `<strong>抽中：${escapeHtml(chosen.displayName)}</strong>搜尋中心：${escapeHtml(label)}<br>類型：${escapeHtml(category)}<br>評分：${rating}<br>價位：${priceText}<br><br><a class="button" href="${chosen.googleMapsURI}" target="_blank" rel="noopener">在 Google Maps 開啟</a>`;
    $("result").hidden = false;
    status(`Google Places 找到 ${matches.length} 間符合條件的餐廳`);
  } catch (error) {
    status(friendlyError(error));
  } finally { button.disabled = false; }
}

function escapeHtml(value) {
  const node = document.createElement("span"); node.textContent = String(value); return node.innerHTML;
}

function friendlyError(error) {
  const message = error?.message || String(error || "");
  if (/referer|referrer|PERMISSION_DENIED/i.test(message)) {
    return "Google 拒絕此網域。請將 API key 的 Website restriction 設為 https://xixa3333.github.io/*，等待數分鐘後重新整理。";
  }
  if (/API_KEY_INVALID|invalid.*key/i.test(message)) return "API key 無效，請確認輸入內容與已啟用的 Google Maps API。";
  return message || "搜尋失敗，請檢查 API 設定後重試。";
}

function priceValue(level) {
  if (level === undefined || level === null || level === "") return null;
  if (Number.isInteger(level) && level >= 0 && level <= 4) return level;
  const normalized = String(level).replace("PRICE_LEVEL_", "");
  return Object.prototype.hasOwnProperty.call(PRICE_VALUES, normalized) ? PRICE_VALUES[normalized] : null;
}

function selectSuggestion(button) {
  const selected = button.getAttribute("aria-pressed") === "true";
  document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  $("keyword").value = selected ? "" : button.dataset.keyword;
  button.setAttribute("aria-pressed", String(!selected));
  if (!selected) $("keyword").focus();
}

$("applyKey").addEventListener("click", saveAndApplyKey);
$("locate").addEventListener("click", locateDevice);
$("search").addEventListener("click", chooseRestaurant);
$("usageLimit").addEventListener("change", () => { localStorage.setItem(LIMIT_KEY, $("usageLimit").value); renderUsage(); });
$("location").addEventListener("input", () => { if ($("location").value.trim() !== state.detectedLabel) state.coordinates = null; });
$("keyword").addEventListener("input", () => document.querySelectorAll(".chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.keyword === $("keyword").value.trim()))));
document.querySelectorAll(".chip").forEach((button) => button.addEventListener("click", () => selectSuggestion(button)));

const savedKey = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || "";
$("apiKey").value = savedKey;
$("rememberKey").checked = Boolean(localStorage.getItem(STORAGE_KEY));
$("usageLimit").value = localStorage.getItem(LIMIT_KEY) || "1000";
renderUsage();
locateDevice();
