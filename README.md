# Food Lottery 食物抽籤器

直接搜尋附近餐廳並隨機抽選，提供手機網頁版與免安裝 Python 的 Windows EXE。

## 下載 Windows EXE

前往 [GitHub Releases](https://github.com/xixa3333/Food_Lottery/releases) 下載最新版 `FoodLottery.exe`。

1. 雙擊執行 `FoodLottery.exe`。
2. 程式會優先以目前網路位置估算所在城市；這不等同 GPS，位置可能有誤差。
3. 無法定位或位置不正確時，在「位置」欄輸入城市、區域或地址。
4. 設定想吃的類型、最低評分與搜尋半徑，再按「幫我抽一間」。

EXE 是由 GitHub Actions 在乾淨的 Windows 環境使用 PyInstaller 建置，不需安裝 Python。

## 手機網頁版

手機直接開啟：<https://xixa3333.github.io/Food_Lottery/>

原始檔位於 `web/index.html` 與 `web/app.js`。使用支援定位的 HTTPS 網站開啟時：

1. 頁面會先要求手機 GPS 定位權限。
2. 若定位被拒絕，頁面會提示至瀏覽器網站設定開啟定位並重新嘗試。
3. 不方便開啟定位時，也可直接輸入城市、區域或地址。

瀏覽器基於安全規定，GPS 定位通常只允許 HTTPS 或 localhost。直接以手機開啟下載後的 HTML 檔案可能無法定位，建議部署至 GitHub Pages 或其他 HTTPS 網站。

## 資料來源

- 地點文字解析：[Nominatim](https://nominatim.org/)
- 餐廳資料：[Overpass API](https://overpass-api.de/)
- Windows 網路位置：[IPWho](https://ipwho.is/)

以上皆為免 API key 的公共服務，請勿高頻或大量呼叫。餐廳內容來自 OpenStreetMap 社群，完整度與評分資料會因地區而異；最低評分設為 `0` 才會包含沒有評分的店家。

## 開發與測試

需要 Python 3.10 以上：

```powershell
python -m unittest discover -s tests -v
python app/food_lottery.py
```

專案結構：

```text
README.md
app/
  food_lottery.py
tests/
  test_food_lottery.py
web/
  index.html
  app.js
```

## 隱私與安全

- 沒有內建 API key 或密鑰。
- LINE Notify 已停止服務，相關程式與 token 已移除。
- 定位資訊只會傳給定位、地點解析與餐廳查詢服務，用於本次搜尋。
