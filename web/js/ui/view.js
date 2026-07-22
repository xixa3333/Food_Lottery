import { PRICE_LABELS } from "../config.js?v=20260722-2";
import { priceValue } from "../domain/search.js?v=20260722-2";

export class AppView {
  constructor(document) {
    this.document = document;
    this.byId = (id) => document.getElementById(id);
  }

  setStatus(message) {
    this.byId("status").textContent = message;
  }

  readSearchRequest(state) {
    return {
      currentLocation: state.coordinates,
      locationAccuracy: state.accuracy,
      detectedLabel: state.detectedLabel,
      locationText: this.byId("location").value,
      keyword: this.byId("keyword").value,
      criteria: {
        minRating: this.byId("rating").value,
        radius: this.byId("radius").value,
        minPrice: this.byId("minPrice").value,
        maxPrice: this.byId("maxPrice").value,
        includeUnknownPrice: this.byId("includeUnknownPrice").checked
      }
    };
  }

  renderUsage(usage, limit, reset) {
    this.byId("usageText").textContent = `本月這台裝置透過本網站發出 ${usage.places} 次 Places 請求`;
    this.byId("usageBar").style.width = `${Math.min(100, usage.places / Math.max(1, limit) * 100)}%`;
    this.byId("resetText").textContent = `本機統計將於 ${reset.toLocaleString("zh-TW", { dateStyle: "long", timeStyle: "short" })} 進入新月份。這不是 Google 帳單總量。`;
  }

  renderResult(result) {
    const section = this.byId("result");
    section.replaceChildren();
    const title = this.document.createElement("strong");
    title.textContent = `抽中：${result.place.displayName}`;
    section.append(title);
    const price = priceValue(result.place.priceLevel);
    const lines = [
      `搜尋中心：${result.centerLabel}`,
      `直線距離：約 ${Math.round(result.distance)} 公尺`,
      `類型：${result.place.primaryTypeDisplayName || "餐廳"}`,
      `評分：${Number.isFinite(result.place.rating) ? `${result.place.rating} / 5` : "未提供"}`,
      `價位：${price === null ? "未提供" : PRICE_LABELS[price]}`
    ];
    for (const line of lines) {
      section.append(this.document.createTextNode(line), this.document.createElement("br"));
    }
    section.append(this.document.createElement("br"));
    const link = this.document.createElement("a");
    link.className = "button";
    link.href = result.place.googleMapsURI;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "在 Google Maps 開啟";
    section.append(link);
    section.hidden = false;
  }

  setBusy(busy) {
    this.byId("search").disabled = busy;
  }
}
