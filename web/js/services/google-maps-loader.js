import { GOOGLE_MAPS_SCRIPT } from "../config.js?v=20260722-5";

export class GoogleMapsLoader {
  constructor({ window, document }) {
    this.window = window;
    this.document = document;
    this.pending = null;
  }

  load(apiKey) {
    if (this.window.google?.maps?.importLibrary) return Promise.resolve(this.window.google.maps);
    if (this.pending) return this.pending;
    if (!apiKey) return Promise.reject(new Error("請先輸入並套用自己的 Google Maps API key。"));
    this.pending = new Promise((resolve, reject) => {
      const callback = `foodLotteryMapsReady_${Date.now()}`;
      this.window[callback] = () => {
        delete this.window[callback];
        resolve(this.window.google.maps);
      };
      const script = this.document.createElement("script");
      const params = new URLSearchParams({ key: apiKey, libraries: "places", v: "weekly", loading: "async", callback });
      script.src = `${GOOGLE_MAPS_SCRIPT}?${params}`;
      script.async = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.onerror = () => {
        delete this.window[callback];
        this.pending = null;
        reject(new Error("Google Maps 載入失敗，請檢查 API key、API 限制與網域設定。"));
      };
      this.document.head.appendChild(script);
    });
    return this.pending;
  }
}
