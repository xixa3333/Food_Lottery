export class BrowserLocationService {
  constructor(geolocation) {
    this.geolocation = geolocation;
  }

  locate() {
    if (!this.geolocation) return Promise.reject(new Error("此瀏覽器不支援定位，請手動輸入位置。"));
    return new Promise((resolve, reject) => {
      this.geolocation.getCurrentPosition(
        ({ coords }) => resolve({
          coordinates: { lat: Number(coords.latitude), lng: Number(coords.longitude) },
          accuracy: Math.max(0, Number(coords.accuracy) || 0)
        }),
        (error) => reject(new Error(error.code === 1
          ? "定位權限已關閉。請在瀏覽器網站設定允許定位後重試，或手動輸入位置。"
          : "暫時無法定位，請重試或手動輸入位置。")),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
      );
    });
  }
}
