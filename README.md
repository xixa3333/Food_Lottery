# Food Lottery 食物抽籤器

使用 Google Places 搜尋附近餐廳並隨機抽選。專案是純 HTML、CSS 與 JavaScript，不需安裝 App 或 Python，手機與電腦皆可使用。

## 手機網頁版

直接開啟：<https://xixa3333.github.io/Food_Lottery/>

原始檔位於 `web/`。使用支援定位的 HTTPS 網站開啟時：

1. 頁面會先要求瀏覽器定位權限；手機通常使用 GPS，電腦依裝置與瀏覽器提供的位置來源而定。
2. 若定位被拒絕，頁面會提示至瀏覽器網站設定開啟定位並重新嘗試。
3. 不方便開啟定位時，也可直接輸入城市、區域或地址。

搜尋條件包含：

- 自訂食物關鍵字，或點選牛肉麵、湯麵、滷肉飯、火鍋、燒肉、早午餐、咖啡、甜點、素食與宵夜等熱門推薦。
- 最低 Google 評分。
- 搜尋半徑。
- 半徑是硬性距離限制：Google 查詢使用 `locationRestriction`，回傳後再以經緯度計算直線距離，超出「設定半徑＋裝置定位誤差」的餐廳會被排除。
- 最低與最高價位，可組合成價格區間。
- 啟用價格限制時，Google 未提供價位的餐廳預設會排除；可自行勾選包含。

Google Places 的價位分為免費、`$` 便宜、`$$` 中等、`$$$` 昂貴與 `$$$$` 非常昂貴。這是 Google 提供的相對價格等級，不代表固定金額。

使用 GPS 定位時，瀏覽器會提供精確度估計。例如搜尋半徑 100 公尺、定位誤差 15 公尺時，程式最多接受距定位中心約 115 公尺的結果，不會自動放寬到數公里；手動地址則不加定位誤差。

## 設定自己的 Google Maps API key

每位使用者在頁面輸入自己的 key，key 只保存在該瀏覽器的 session；勾選「記住」後才會保存在該裝置的 localStorage，不會提交到此 GitHub 儲存庫。

1. 前往 [Google Maps Platform](https://console.cloud.google.com/google/maps-apis/overview) 建立 Cloud 專案並啟用帳單。
2. 啟用 **Maps JavaScript API** 與 **Places API (New)**。
3. 建立 API key。
4. Application restrictions 選擇 **Websites**，允許：`https://xixa3333.github.io/*`。Google Places 實際收到的 referrer 是 GitHub Pages 網域來源；若限制到 `/Food_Lottery/*`，請求可能被拒絕。
5. API restrictions 僅允許 Maps JavaScript API 與 Places API (New)。
6. 在 Quotas 設每日上限，並在 Billing 設預算通知。

若看到 `Requests from referer https://xixa3333.github.io/ are blocked`，請確認 Website restriction 使用上面的網域萬用字元，儲存後等待數分鐘，再重新整理網站。

Google Maps Platform 按曆月與 SKU 計費，並對不同 SKU 提供不同的每月免費用量；免費額度與價格可能變更，使用前請查看[官方定價表](https://developers.google.com/maps/billing-and-pricing/pricing)。使用者仍須為自己 API key 產生的費用負責。

網站會記錄這台裝置本月透過本站發出的 Places 請求次數，並顯示下個月開始時間。手動位置解析也使用 Places API (New)，不需要另外啟用 Geocoding API。這只是本機估算，清除瀏覽器資料、換裝置或在其他網站使用同一把 key 都不會反映；準確總量須查看 [Google Maps Platform Metrics](https://console.cloud.google.com/google/maps-apis/metrics)。

瀏覽器基於安全規定，GPS 定位通常只允許 HTTPS 或 localhost。直接以手機開啟下載後的 HTML 檔案可能無法定位，建議部署至 GitHub Pages 或其他 HTTPS 網站。

## 資料來源

餐廳、評分、地點文字解析與 Google Maps 連結皆由 Google Maps Platform 提供。最低評分設為 `0` 才會包含沒有評分的店家。

## 開發與測試

這是靜態網站，可直接用本機 HTTP server 預覽；定位功能需 HTTPS 或 localhost。

專案結構：

```text
README.md
web/
  index.html
  styles.css
  js/
    app.js                  # 組裝相依性與事件流程
    application/           # 使用案例
    domain/                # 距離、價格與篩選規則
    services/              # Google Places、定位與本機儲存
    ui/                    # DOM 呈現與錯誤訊息
  tests/                   # 單元、整合、邊界、白盒與安全測試
```

這是 GitHub Pages 靜態前端，因此沒有假裝存在的伺服器後端；Google Places 被隔離在 service 介面，未來若改接自有 API，只需替換 provider。執行測試：`cd web && npm test`。

若仍看見 `GEOCODER_GEOCODE`，代表瀏覽器載入了舊版快取；新版完全不呼叫 Geocoder。請關閉舊分頁後重新開啟，必要時清除此網站的快取。頁尾版本可用來確認更新。

## 隱私與安全

- 儲存庫沒有內建 API key 或密鑰。
- LINE Notify 已停止服務，相關程式與 token 已移除。
- 使用者輸入的 API key 只保存在該瀏覽器的 session 或 localStorage。
- 定位資訊會傳給 Google Maps Platform，用於本次搜尋。
