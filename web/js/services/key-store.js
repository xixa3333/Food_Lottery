export class ApiKeyStore {
  constructor({ sessionStorage, localStorage, key }) {
    this.sessionStorage = sessionStorage;
    this.localStorage = localStorage;
    this.key = key;
  }

  read() {
    return (this.sessionStorage.getItem(this.key) || this.localStorage.getItem(this.key) || "").trim();
  }

  save(value, remember = false) {
    const apiKey = String(value || "").trim();
    if (!apiKey) throw new Error("請先輸入 Google Maps API key。");
    this.sessionStorage.setItem(this.key, apiKey);
    if (remember) this.localStorage.setItem(this.key, apiKey);
    else this.localStorage.removeItem(this.key);
    return apiKey;
  }

  isRemembered() {
    return Boolean(this.localStorage.getItem(this.key));
  }
}
