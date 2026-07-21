# Food Lottery 食物抽籤器

以 OpenStreetMap 的免費服務搜尋附近餐廳，再依條件隨機推薦。新版不再依賴 Google Maps DOM、Selenium、ChromeDriver 或 API key。

## 快速開始

需要 Python 3.10 以上版本：

```powershell
python app/food_lottery.py --location "高雄市苓雅區" --keyword "火鍋" --min-rating 4
```

也可直接執行並依提示輸入：

```powershell
python app/food_lottery.py
```

選項：

- `--location`：地名或地址。
- `--keyword`：餐廳名稱或料理類型；留空時搜尋所有餐飲場所。
- `--radius`：搜尋半徑（公尺），預設 3000，最大 20000。
- `--min-rating`：最低評分 0～5。OpenStreetMap 很多店家沒有評分，設定 0 才會包含它們。
- `--seed`：固定隨機種子，方便重現結果。

## 資料來源與限制

- 地點解析使用 [Nominatim](https://nominatim.org/)，餐廳資料使用 [Overpass API](https://overpass-api.de/)。兩者皆不需 API key，但屬公共服務，請勿大量或高頻呼叫。
- 餐廳資料來自 OpenStreetMap 社群，完整度因地區而異。
- 評分取自 OSM 的 `rating` 標籤；未提供評分的店家不會通過大於 0 的最低評分條件。
- 若公共端點忙碌，程式會顯示錯誤，可稍後重試。

## 專案結構

```text
README.md
app/
  food_lottery.py
tests/
  test_food_lottery.py
web/
  bookmarklet.js
```

瀏覽器書籤版保留在 `web/bookmarklet.js`，供偏好 Google Maps 網頁操作的使用者使用；它仍可能因 Google Maps 改版而失效。

## 測試

```powershell
python -m unittest discover -s tests -v
```

## 隱私與安全

程式沒有內建密鑰，也不會上傳個人資料。舊版曾使用的 LINE Notify 已於 2025 年停止服務，因此相關自動通知程式已移除；若曾使用舊版硬編碼 token，請在原服務端撤銷它。
