# Food Lottery 食物抽籤器

直接搜尋附近餐廳並隨機抽選。專案是純 HTML、CSS 與 JavaScript，不需安裝 App 或 Python，手機與電腦皆可使用。

## 手機網頁版

直接開啟：<https://xixa3333.github.io/Food_Lottery/>

原始檔位於 `web/index.html` 與 `web/app.js`。使用支援定位的 HTTPS 網站開啟時：

1. 頁面會先要求瀏覽器定位權限；手機通常使用 GPS，電腦依裝置與瀏覽器提供的位置來源而定。
2. 若定位被拒絕，頁面會提示至瀏覽器網站設定開啟定位並重新嘗試。
3. 不方便開啟定位時，也可直接輸入城市、區域或地址。

瀏覽器基於安全規定，GPS 定位通常只允許 HTTPS 或 localhost。直接以手機開啟下載後的 HTML 檔案可能無法定位，建議部署至 GitHub Pages 或其他 HTTPS 網站。

## 資料來源

- 地點文字解析：[Nominatim](https://nominatim.org/)
- 餐廳資料：[Overpass API](https://overpass-api.de/)
- Windows 網路位置：[IPWho](https://ipwho.is/)

以上皆為免 API key 的公共服務，請勿高頻或大量呼叫。餐廳內容來自 OpenStreetMap 社群，完整度與評分資料會因地區而異；最低評分設為 `0` 才會包含沒有評分的店家。

## 開發與測試

這是靜態網站，可直接用本機 HTTP server 預覽；定位功能需 HTTPS 或 localhost。

專案結構：

```text
README.md
web/
  index.html
  app.js
```

## 隱私與安全

- 沒有內建 API key 或密鑰。
- LINE Notify 已停止服務，相關程式與 token 已移除。
- 定位資訊只會傳給地點解析與餐廳查詢服務，用於本次搜尋。
