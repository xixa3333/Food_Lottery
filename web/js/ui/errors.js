import { GOOGLE_REFERRER } from "../config.js?v=20260722-4";

export function friendlyError(error) {
  const message = error?.message || String(error || "");
  if (/GEOCODER_GEOCODE/i.test(message)) {
    return "偵測到舊版快取。請關閉此分頁後重新開啟，或清除此網站的快取；新版不會使用 Geocoder。";
  }
  if (/referer|referrer|PERMISSION_DENIED/i.test(message)) {
    return `Google 拒絕此網域。請將 API key 的 Website restriction 設為 ${GOOGLE_REFERRER}，等待數分鐘後重新整理。`;
  }
  if (/API_KEY_INVALID|invalid.*key/i.test(message)) return "API key 無效，請確認輸入內容與已啟用的 Google Maps API。";
  return message || "搜尋失敗，請檢查 API 設定後重試。";
}
