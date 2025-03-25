# Google 地圖餐廳篩選與隨機推薦工具

此專案提供兩種工具，幫助使用者從 Google 地圖搜尋並隨機推薦符合條件的餐廳：
1. **`get.exe`**：基於 Python 的爬蟲工具，利用 Selenium 和 BeautifulSoup 抓取資料。
2. **`get.js`**：JavaScript 書籤工具，直接在瀏覽器中執行，提供即時篩選與隨機選擇。

兩者皆可根據使用者指定的餐廳類型和最低星級進行篩選，並隨機推薦一間餐廳。

---

## 工具一：get.exe（爬蟲工具）

### 功能
- 從 Google 地圖搜尋指定類型的餐廳。
- 篩選出符合評價（星數）條件的餐廳。
- 隨機抽選並推薦一間餐廳給使用者。
- 支援重新抽選功能。

### 必要條件
- **Windows 作業系統**。
- 已安裝 **Google Chrome 瀏覽器**（建議最新版本）。
- 安裝 Python 環境（若自行編譯原始碼）及相關套件（如 Selenium、BeautifulSoup）。

### 使用方式
1. **下載執行檔**：
   - 下載 `get.exe` 至您的電腦（若提供可執行檔）。
   - 或從原始碼編譯（需安裝依賴套件）。

2. **啟動程式**：
   - 雙擊 `get.exe`，或在命令提示字元中執行：
     ```bash
     get.exe
     ```

3. **輸入條件**：
   - 輸入想搜尋的餐廳類型，例如：`火鍋`。
   - 設定最低星級，例如：`4.5`。

4. **檢視篩選結果**：
   - 程式會顯示符合條件的餐廳資訊，包括名稱、營業狀態及評價。

5. **隨機推薦餐廳**：
   - 程式隨機挑選一間餐廳，並提供重新抽選選項。

### 注意事項
- **網路連線**：需保持穩定網路以進行資料抓取。
- **ChromeDriver**：若自行編譯，需確保 ChromeDriver 與 Chrome 版本相容。

### 錯誤排除
- 若 `get.exe` 無法運行，檢查 ChromeDriver 是否正確配置。
- 若瀏覽器版本不符，請更新 Chrome 和 ChromeDriver。

---

## 工具二：get.js（書籤工具）

### 功能
- 在 Google 地圖頁面中搜尋指定餐廳類型。
- 根據最低星級篩選營業中的餐廳。
- 從符合條件的餐廳中隨機挑選一間，並支援重抽。
- 自動點擊按鈕跳轉至餐廳詳細頁面。
- 提供詳細的調試資訊。

### 程式碼
```javascript
javascript:(function(){var whateat=prompt("你要查什麼？");if(!whateat)return alert("請輸入有效的搜尋內容！");var whatstar=parseFloat(prompt("你要幾星以上的(請寫數字)？"))||0;if(isNaN(whatstar)||whatstar<0||whatstar>5)return alert("請輸入有效的星級（0-5）！");if(!window.location.href.includes("google.com/maps")){window.location.href="https://www.google.com/maps";alert("請等待頁面加載後再次運行此書籤！");return}var searchButton=document.querySelector(".JdG3E");if(searchButton){searchButton.click();setTimeout(function(){var searchBox=document.getElementById("ml-searchboxinput");if(!searchBox){alert("搜尋框未載入，請稍後重試！");return}searchBox.value=whateat;searchBox.dispatchEvent(new Event("input"));searchBox.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",keyCode:13}));setTimeout(function(){var scrollableDiv=document.querySelector("div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde");if(!scrollableDiv){alert("找不到滾動容器！請確認頁面已加載。");return}var maxScrolls=20;var scrollPauseTime=500;var scrollCount=0;function scrollNext(){if(scrollCount<maxScrolls){scrollableDiv.scrollTop=scrollableDiv.scrollHeight;scrollCount++;setTimeout(scrollNext,scrollPauseTime)}else{processResults()}}function processResults(){var results=[];var items=document.querySelectorAll(".Nv2PK.THOPZb");if(items.length===0){alert("找不到店家元素！請確認搜尋結果已加載並滾動頁面。");return}var debugInfo="調試資訊：\n";items.forEach(function(item){var nameElem=item.querySelector(".hfpxzc");var starElem=item.querySelector(".MW4etd");var statusElems=item.querySelectorAll(".W4Efsd .W4Efsd span span span");var button=item.querySelector("button[aria-label]");var name=nameElem?nameElem.getAttribute("aria-label")||"無名稱":"無名稱";var star=starElem?parseFloat(starElem.textContent.trim())||0:0;var status="N/A";if(statusElems.length>0){statusElems.forEach(function(statusEl){var statusText=statusEl.textContent.trim();if(["營業中","即將打烊","已打烊","暫時關閉","即將開始營業"].some(s=>statusText.includes(s))){status=statusText}});};debugInfo+=name+": 評分="+star+", 狀態="+status+", 按鈕="+(button?"存在":"不存在")+"\n";if((["營業中","即將開始營業"].some(s=>status.includes(s)))&&star>whatstar&&button){results.push({name:name,star:star,status:status,button:button})}});if(results.length===0){alert("找不到符合條件的餐廳！找到 "+items.length+" 個元素，但無符合條件者。\n\n"+debugInfo);return}var chosen=null;do{chosen=results[Math.floor(Math.random()*results.length)];alert("抽中：\n"+chosen.name+"\n評分："+chosen.star+"⭐\n狀態："+chosen.status+"\n\n點擊‘確定’重抽，‘取消’跳轉");}while(confirm("要重抽嗎？"));if(chosen.button){chosen.button.click();alert("已點擊按鈕："+chosen.name+"，正在跳轉...")}else{alert("按鈕不可用："+chosen.name+"！請確認頁面狀態。")}}scrollNext()},5000)},1000)}else{setTimeout(function(){var scrollableDiv=document.querySelector("div.m6QErb.DxyBCb.kA9KIf.dS8AEf.XiKgde");if(!scrollableDiv){alert("找不到滾動容器！請確認頁面已加載。");return}var maxScrolls=20;var scrollPauseTime=500;var scrollCount=0;function scrollNext(){if(scrollCount<maxScrolls){scrollableDiv.scrollTop=scrollableDiv.scrollHeight;scrollCount++;setTimeout(scrollNext,scrollPauseTime)}else{processResults()}}function processResults(){var results=[];var items=document.querySelectorAll(".Nv2PK.THOPZb");if(items.length===0){alert("找不到店家元素！請確認已在結果頁並滾動加載。");return}var debugInfo="調試資訊：\n";items.forEach(function(item){var nameElem=item.querySelector(".hfpxzc");var starElem=item.querySelector(".MW4etd");var statusElems=item.querySelectorAll(".W4Efsd .W4Efsd span span span");var button=item.querySelector("button[aria-label]");var name=nameElem?nameElem.getAttribute("aria-label")||"無名稱":"無名稱";var star=starElem?parseFloat(starElem.textContent.trim())||0:0;var status="N/A";if(statusElems.length>0){statusElems.forEach(function(statusEl){var statusText=statusEl.textContent.trim();if(["營業中","即將打烊","已打烊","暫時關閉","即將開始營業"].some(s=>statusText.includes(s))){status=statusText}});};debugInfo+=name+": 評分="+star+", 狀態="+status+", 按鈕="+(button?"存在":"不存在")+"\n";if((["營業中","即將開始營業"].some(s=>status.includes(s)))&&star>whatstar&&button){results.push({name:name,star:star,status:status,button:button})}});if(results.length===0){alert("找不到符合條件的餐廳！找到 "+items.length+" 個元素，但無符合條件者。\n\n"+debugInfo);return}var chosen=null;do{chosen=results[Math.floor(Math.random()*results.length)];alert("抽中：\n"+chosen.name+"\n評分："+chosen.star+"⭐\n狀態："+chosen.status+"\n\n點擊‘確定’重抽，‘取消’跳轉");}while(confirm("要重抽嗎？"));if(chosen.button){chosen.button.click();alert("已點擊按鈕："+chosen.name+"，正在跳轉...")}else{alert("按鈕不可用："+chosen.name+"！請確認頁面狀態。")}}scrollNext()},2000)}})();
```

### 使用方式
1. **建立書籤**：
   - 複製上述程式碼。
   - 在瀏覽器中新增書籤，將程式碼貼至「網址」欄，命名為「餐廳隨機挑選器」。

2. **執行步驟**：
   - 開啟 Google Maps（`https://www.google.com/maps`）。
   - 點擊書籤，依提示輸入：
     - 想吃的食物類型（例如「披薩」）。
     - 最低星級（例如 `4`）。
   - 程式自動搜尋、滾動頁面並篩選。
   - 隨機挑選一間餐廳，顯示名稱、評分和狀態。
   - 點擊「確定」重抽，點擊「取消」跳轉至餐廳頁面。

### 注意事項
- **頁面載入**：確保 Google Maps 完全載入，否則可能找不到元素。
- **選擇器相容性**：若 Google Maps 更新 DOM 結構，需調整程式碼中的選擇器。
- **營業狀態**：僅篩選「營業中」或「即將開始營業」的餐廳。
- **滾動限制**：預設滾動 20 次，可能無法載入所有結果。
- **確認定位，右下角記得打開**:
- <img src="https://github.com/xixa3333/Food_Lottery/blob/master/S__16998535.jpg" alt="image" width="250" height="500">

---

## 比較與選擇建議
| 特性                | get.exe（爬蟲工具）         | get.js（書籤工具）         |
|---------------------|-----------------------------|----------------------------|
| **執行環境**        | Windows + Chrome           | 任何支援書籤的瀏覽器      |
| **安裝需求**        | Python、Selenium 等        | 無需安裝，直接使用         |
| **使用難度**        | 需下載並執行程式           | 簡單新增書籤即可           |
| **速度**            | 較慢（伺服器端抓取）       | 較快（客戶端即時操作）     |
| **穩定性**          | 依賴 ChromeDriver         | 依賴 Google Maps DOM      |

- 若您偏好輕量、即時操作，建議使用 `get.js`。
- 若需更穩定的資料抓取或後續處理，建議使用 `get.exe`。

---

## 聯絡方式
若有問題或建議，歡迎開啟 [Issue](https://github.com/yourusername/yourrepo/issues) 或聯繫作者！
