import { PRICE_LABELS } from "../config.js?v=20260722-5";
import { priceValue } from "../domain/search.js?v=20260722-5";
import { FOOD_TYPES, POPULAR_FOOD_TYPES } from "../config/food-types.js?v=20260722-5";

export class AppView {
  constructor(document) {
    this.document = document;
    this.byId = (id) => document.getElementById(id);
  }

  setStatus(message) {
    this.byId("status").textContent = message;
  }

  renderTypeSelector() {
    const list = this.byId("typeList");
    list.replaceChildren();
    for (const group of [...new Set(FOOD_TYPES.map((type) => type.group))]) {
      const heading = this.document.createElement("strong");
      heading.className = "type-group-title";
      heading.textContent = group;
      list.append(heading);
      for (const type of FOOD_TYPES.filter((item) => item.group === group)) {
        const label = this.document.createElement("label");
        label.className = "type-option";
        label.dataset.search = `${type.label} ${type.id}`.toLowerCase();
        const input = this.document.createElement("input");
        input.type = "checkbox";
        input.value = type.id;
        input.checked = true;
        label.append(input, this.document.createTextNode(type.label));
        list.append(label);
      }
    }
    this.updateTypeCount();
  }

  setTypeSelection(mode) {
    const popular = new Set(POPULAR_FOOD_TYPES);
    this.document.querySelectorAll("#typeList input").forEach((input) => {
      input.checked = mode === "all" || (mode === "popular" && popular.has(input.value));
    });
    this.updateTypeCount();
  }

  filterTypeOptions(query) {
    const term = query.trim().toLowerCase();
    this.document.querySelectorAll("#typeList .type-option").forEach((label) => { label.hidden = Boolean(term) && !label.dataset.search.includes(term); });
  }

  updateTypeCount() {
    const selected = this.document.querySelectorAll("#typeList input:checked").length;
    this.byId("typeCount").textContent = `已選 ${selected} / ${FOOD_TYPES.length} 種`;
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
        includeUnknownPrice: this.byId("includeUnknownPrice").checked,
        includeClosingSoon: this.byId("includeClosingSoon").checked,
        includeClosed: this.byId("includeClosed").checked,
        includeUnknownHours: this.byId("includeUnknownHours").checked
        ,selectedTypes: [...this.document.querySelectorAll("#typeList input:checked")].map((input) => input.value)
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
      `價位：${price === null ? "未提供" : PRICE_LABELS[price]}`,
      `營業狀態：${result.opening.label}`
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
    this.byId("reroll").hidden = false;
  }

  setBusy(busy) {
    this.byId("search").disabled = busy;
    this.byId("reroll").disabled = busy;
  }
}
