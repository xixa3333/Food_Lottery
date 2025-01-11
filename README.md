# Google 地圖餐廳篩選與隨機推薦工具

此工具利用 Selenium 和 BeautifulSoup 從 Google 地圖中抓取餐廳資訊，並根據使用者設定的條件篩選出符合需求的餐廳，最終隨機推薦一間餐廳。

## 功能
- 從 Google 地圖搜尋指定類型的餐廳。
- 篩選出符合評價（星數）條件的餐廳。
- 隨機抽選並推薦一間餐廳給使用者。
- 支援重新抽選功能。

## 必要條件
1. **Windows 作業系統**。
2. 需要安裝 Google Chrome 瀏覽器（建議最新版本）。

## 使用方式
1. **下載執行檔**：
   確保已下載 `get.exe` 至您的電腦。

2. **啟動程式**：
   雙擊 `get.exe` 或在命令提示字元中執行：
   ```bash
   get.exe
   ```

3. **輸入條件**：
   - 在提示時輸入想要搜尋的餐廳類型，例如：`火鍋`。
   - 設定篩選條件，輸入目標星級（例如 `4.5`）。

4. **檢視篩選結果**：
   程式將篩選出符合條件的餐廳，並顯示名稱、營業狀態及評價。

5. **隨機推薦餐廳**：
   程式將隨機推薦一間餐廳給使用者，並提供重新抽選的選項。

## 注意事項
1. **網路連線**：執行此程式時需要穩定的網路連線。

## 錯誤排除
- 若 `get.exe` 無法運行，請確認 ChromeDriver 是否正確安裝並配置。
- 如果遇到瀏覽器不相容，請更新 Chrome 和 ChromeDriver 至相同版本。

## 聯絡方式
若有問題或建議，歡迎聯繫作者以獲取更多支援！