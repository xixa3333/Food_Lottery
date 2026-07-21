const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
];
const state = { coordinates: null, detectedLabel: "" };

const $ = (id) => document.getElementById(id);
const status = (message) => { $("status").textContent = message; };

async function locateDevice() {
  if (!navigator.geolocation) {
    status("此瀏覽器不支援定位，請手動輸入位置。");
    return;
  }
  status("正在取得手機目前位置…");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.coordinates = [coords.latitude, coords.longitude];
      state.detectedLabel = "目前位置";
      $("location").value = state.detectedLabel;
      status(`定位成功（精確度約 ${Math.round(coords.accuracy)} 公尺）`);
    },
    (error) => {
      state.coordinates = null;
      const hint = error.code === error.PERMISSION_DENIED
        ? "定位權限已關閉。請在瀏覽器網站設定中允許定位後按「重新定位」，或手動輸入位置。"
        : "暫時無法定位，請移到訊號良好的位置重試，或手動輸入位置。";
      status(hint);
      $("location").focus();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
  );
}

async function geocode(query) {
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "Accept-Language": "zh-TW" } });
  if (!response.ok) throw new Error("地點查詢服務暫時無法使用");
  const items = await response.json();
  if (!items.length) throw new Error(`找不到地點：${query}`);
  return [Number(items[0].lat), Number(items[0].lon), items[0].display_name];
}

async function fetchVenues(latitude, longitude, radius) {
  const query = `[out:json][timeout:25];(nwr["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:${radius},${latitude},${longitude}););out center tags;`;
  let payload;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query })
      });
      if (response.ok) { payload = await response.json(); break; }
    } catch (_) { /* Try the next public mirror. */ }
  }
  if (!payload) throw new Error("餐廳資料服務忙碌中，請稍後重試");
  return payload.elements.flatMap((element) => {
    const tags = element.tags || {};
    const center = element.center || element;
    const name = tags.name || tags["name:zh"];
    if (!name || center.lat == null || center.lon == null) return [];
    const rating = Number(tags.rating);
    return [{ name, category: tags.cuisine || tags.amenity || "food", rating: Number.isFinite(rating) ? rating : null, latitude: center.lat, longitude: center.lon }];
  });
}

async function chooseRestaurant() {
  const button = $("search");
  const locationText = $("location").value.trim();
  const keyword = $("keyword").value.trim().toLocaleLowerCase();
  const minRating = Number($("rating").value);
  const radius = Number($("radius").value);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5 || !Number.isInteger(radius) || radius < 100 || radius > 20000) {
    status("評分須為 0–5，半徑須為 100–20000 公尺。");
    return;
  }
  if (!state.coordinates && !locationText) {
    status("請開啟定位並重新定位，或手動輸入位置。");
    $("location").focus();
    return;
  }
  button.disabled = true;
  status("正在搜尋附近餐廳…");
  try {
    const [lat, lon, label] = state.coordinates && locationText === state.detectedLabel
      ? [...state.coordinates, state.detectedLabel]
      : await geocode(locationText);
    const venues = await fetchVenues(lat, lon, radius);
    const matches = venues.filter((venue) => {
      const text = `${venue.name} ${venue.category}`.toLocaleLowerCase();
      return (!keyword || text.includes(keyword)) && (minRating <= 0 || venue.rating !== null && venue.rating >= minRating);
    });
    if (!matches.length) throw new Error("找不到符合條件的餐廳，請清空關鍵字、降低評分或加大半徑。");
    const chosen = matches[Math.floor(Math.random() * matches.length)];
    const map = `https://www.openstreetmap.org/?mlat=${chosen.latitude}&mlon=${chosen.longitude}#map=18/${chosen.latitude}/${chosen.longitude}`;
    $("result").innerHTML = `<strong>抽中：${escapeHtml(chosen.name)}</strong><br>搜尋中心：${escapeHtml(label)}<br>類型：${escapeHtml(chosen.category)}<br>評分：${chosen.rating ?? "未提供"}<br><br><a class="button" href="${map}" target="_blank" rel="noopener">在地圖開啟</a>`;
    $("result").hidden = false;
    status(`找到 ${matches.length} 間符合條件的餐廳`);
  } catch (error) {
    status(error.message || "搜尋失敗，請稍後重試。");
  } finally {
    button.disabled = false;
  }
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = String(value);
  return node.innerHTML;
}

$("locate").addEventListener("click", locateDevice);
$("search").addEventListener("click", chooseRestaurant);
$("location").addEventListener("input", () => {
  if ($("location").value.trim() !== state.detectedLabel) state.coordinates = null;
});
locateDevice();
