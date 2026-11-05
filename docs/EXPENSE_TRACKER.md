# Expense Tracker HK v3.16.0｜記帳 Widget / Shortcuts Guide

> Script: [widgets/expense-tracker/HK-Expense-Tracker.js](../widgets/expense-tracker/HK-Expense-Tracker.js)  
> Sample JSON: [simple](../examples/expense-transaction.example.json) · [nested Shortcuts object](../examples/expense-transaction.nested.example.json) · [schema](../schemas/expense-transaction.schema.json)

## 廣東話 / 繁體中文

### 主要功能
- iPhone Scriptable Widget：Small（7日）、Medium（14日）、Large（分類 + 最近交易）、iPad Extra Large（30日）。
- 用 Apple Shortcuts + Apple Intelligence 產生 Dictionary，直接傳入 Scriptable 的 **Run Script → Shortcut Parameter**。
- 多層輸入解析：原生 Dictionary、JSON、Markdown/文字包住嘅 JSON、已知欄位名稱 Regex 容錯、舊 Wallet pipe 格式。
- 金額只接受有效**非零**數字；`null`、空字串、`0`、`"0.00"` 不記錄；負數當退款。
- 可接受 `amount: { "content": "9.60", "uuid": "..." }`，不會從信用卡號、日期或 UUID 推測金額。
- 日期、商戶、類別、卡名或貨幣可以留空；缺日期／未換算貨幣的交易會儲存，但不計入 HKD 時間圖表。
- 支援外幣換算、分類圖、最近交易、CSV 匯出、JSON 本機備份與交易核對。

### 安裝
1. 安裝 iOS [Scriptable](https://apps.apple.com/app/scriptable/id1405459188)；新增一條 Script（例如 `Expense Tracker HK`）。
2. 複製 [HK-Expense-Tracker.js](../widgets/expense-tracker/HK-Expense-Tracker.js) **全部內容**貼入新 Script（不要追加在舊程式後）。
3. 直接由 Scriptable 開啟一次，使用主選單操作 Dashboard、預覽不同 Widget 尺寸或備份。
4. 喺 Shortcuts 加入 Apple Intelligence 步驟，輸出以下六個鍵的 Dictionary：`merchantType`, `merchantName`, `currency`, `amount`, `card`, `date`。
5. 加入 Scriptable **Run Script** 動作，選擇新 Script，`Shortcut Parameter` 指向該 Dictionary；**毋須轉為 JSON 字串**。
6. 新增 Scriptable 主畫面 Widget，選擇同一 Script；按 Widget 可打開 Dashboard。

### 輸入例子
```json
{
  "merchantType": "Restaurants",
  "merchantName": "Example Cafe",
  "currency": "HKD",
  "amount": 42.5,
  "card": "EXAMPLE CARD",
  "date": "20261101_124500"
}
```

`amount` 亦可以係 `{"content":"9.60","uuid":"00000000-0000-4000-8000-000000000000"}`。注意：上述全部係**虛構測試資料**。

### Apple Intelligence / Scriptable 排錯（v3.7）
1. 在「使用裝置端模型」撳右邊箭嘴，於 **Output** 明確選 **Dictionary**（只寫「Output a Dictionary」喺 Prompt 並不足夠）。
2. **Run Expense** 之前加入 **Quick Look（快速查看）**，選模型的「回應」，核對真正有 `amount` 及其他欄位。
3. **Run Expense** 之後加入 **Show Result（顯示結果）**，選 **Run Expense 的輸出**。訊息應以 `[EXPENSE-HK-v3.7.1]` 開頭，顯示接收類型、解析方式、有效金額及新增／重複狀態。
4. 確認手機 Scriptable 嘅 `Expense` 程式已貼入最新 [HK-Expense-Tracker.js](../widgets/expense-tracker/HK-Expense-Tracker.js)；GitHub 更新唔會自動同步到手機。
5. 若 `Quick Look` 冇非零 `amount`，先檢查 Apple Intelligence 原始輸入或 Magic Variables；若有、但 Scriptable 說未收到資料，檢查 `Run Expense with 回應` 的參數連接。
6. **隔離測試：** 暫時以 `{"merchantName":"Example Cafe","currency":"HKD","amount":42.5,"date":"20261103_120000"}` Dictionary 替換模型輸入。若能新增一筆，代表 Scriptable 儲存正常，而模型輸出需要修正。測試會寫入真實本機資料庫，完成後請自行核對／清理。

**私隱：** 排錯結果只顯示欄位名稱、數值／類型等必要摘要，不應上傳真實快捷指令回應、卡名、完整交易紀錄或 UUID 到公開 GitHub。

### 重要：模型回應 ≠ Run Expense 入帳回條

如果 Shortcuts 最後顯示嘅內容只係六個欄位嘅 JSON（`merchantName`, `amount`, `currency` 等），**嗰份唔係 Expense Tracker v3.7 嘅成功入帳回條**。腳本成功／失敗都會用 `[EXPENSE-HK-v3.7.1]` 開頭，並顯示交易儲存及 `transactions.json` 讀回核實結果。

請喺 Shortcuts 最後加入 **「顯示結果」（Show Result）**：
1. 點「顯示結果」入面嘅藍色 Magic Variable。
2. **必須選 Scriptable「Run Expense」動作嘅輸出**，唔係 Apple Intelligence「回應」。
3. 手機上名為 `Expense` 嘅 Script 必須貼入 GitHub 最新版；只係更新 GitHub 唔會改手機內已安裝 Script。
4. 如出現 `[EXPENSE-HK-v3.7.1] 已儲存… 磁碟核實…` 就已核實本機寫入；若只見 JSON，代表仍然未睇到 Scriptable 真正回條。
5. 若 Scriptable 收唔到 Shortcut Parameter，v3.7 會嘗試 `args.plainTexts` 作備用來源。

### 故障排除
- **Shortcuts / Siri 顯示 Alerts are not supported in Siri**：確認使用最新版 Script；Run Script 需收到 Dictionary，Siri 模式不應彈主選單。
- **新增 0 筆**：檢查 amount 是否空、0、非數字；亦可能係重複 transaction ID。
- **記錄已存，但 Widget 冇計入**：核對交易日期是否有效、貨幣是否 HKD 或已成功換算。
- **外幣待換算**：到 Scriptable 主選單手動「重試外幣換算」。
- **Widget 唔即時更新**：`refreshAfterDate` 只係最早建議刷新時刻，iOS 會自行調度。

### 私隱與數據
- **切勿**上傳 `ExpenseTrackerHK/transactions.json`、`backup.json`、`transactions.csv`、卡資料或真實 Apple Intelligence 輸出到公開 repository。
- 本機檔案位於 Scriptable 的 `ExpenseTrackerHK` 目錄；備份應放私人位置。
- 外幣換算使用 Frankfurter HTTPS API，傳送**貨幣對與日期**，唔傳送交易金額、商戶或卡名。
- 此版本並非銀行官方交易帳本；匯率為參考值，並非信用卡實際結算匯率。

---

## English

### Features
- Adaptive Scriptable widgets: Small (7 days), Medium (14), Large (categories and recent transactions), and iPad Extra Large (30).
- Apple Intelligence / Shortcuts **Dictionary** input directly through Scriptable **Run Script → Shortcut Parameter**.
- Defensive extraction: native objects, valid JSON, embedded JSON, bounded key-value regex fallback, and legacy text.
- Saves **only valid nonzero amounts**. Skips null, empty strings, zero and invalid values; negative values are refunds.
- Supports Shortcuts typed values such as `{"content":"9.60","uuid":"..."}`; never takes a random number from a card, timestamp or UUID.
- Other missing fields are allowed. Incomplete date or FX information affects charts, not persistence.
- Dashboard, category summaries, recent transactions, FX reference conversion, CSV exports, and local JSON backups.

### Setup
1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188), create a new script, and paste the entire [HK-Expense-Tracker.js](../widgets/expense-tracker/HK-Expense-Tracker.js) file.
2. Run it once in Scriptable for the menu and widget previews.
3. In Shortcuts, have Apple Intelligence emit a Dictionary with `merchantType`, `merchantName`, `currency`, `amount`, `card`, and `date`.
4. Pass that Dictionary directly into Scriptable **Run Script → Shortcut Parameter**. No conversion to JSON text is necessary.
5. Configure a home-screen Scriptable widget to use the same script.

### Troubleshooting Apple Intelligence output (v3.6)
- Set **Use Model → Output → Dictionary** explicitly. Prompt wording alone does not enforce the output type.
- Insert **Quick Look** before Run Expense to inspect the model Response; add **Show Result** after Run Expense and select **Run Expense's output**.
- Confirm that the local Scriptable script selected by Run Expense was replaced with the latest code. Updating GitHub does not update the installed iPhone script.
- v3.7 returns a disk-verified receipt and diagnostic summary of input type, field keys, detected nonzero amount, parser method and saved/duplicate status. It does not print full merchant or card data.
- Use a synthetic Dictionary with amount 42.5 to isolate model formatting from Scriptable storage. This will create a test record in the local database.

### Privacy and limitations
This public repository contains **code and synthetic JSON examples only**. Do not commit your real transaction database, exported CSV or backups. FX rate lookups send the currency pair and date only. Widget reload timing is controlled by iOS; `refreshAfterDate` is not a guaranteed refresh interval. Live iPhone execution should be validated separately from JavaScript tests.


## Separate widget folder & version history / 獨立版本紀錄
The canonical version and dated changelog are in [widgets/expense-tracker](../widgets/expense-tracker/); its standalone Scriptable JS is mirrored at the previous `scripts/` URL. GitHub does not automatically synchronize the installed iPhone script.

### v3.7.1 Shortcuts 快速入帳修正
Shortcuts／Siri 記帳依家只做本機儲存同磁碟核實，唔會因為舊外幣交易嘅 FX API 未回應而卡住。新外幣交易會先以 `pending` 儲存，再喺 Scriptable App 主選單用「重試外幣換算」補返 HKD 估算。入帳回條以 `[EXPENSE-HK-v3.7.1]` 開頭。更新 GitHub 並不會更新 iPhone 已貼入嘅 Scriptable 程式。

## Apple Numbers Data Table / Apple Numbers 表格寫入 (v3.8.0)

**注意：** Scriptable 本身只會儲存到 `ExpenseTrackerHK/transactions.json`。Apple Numbers 係另一個資料庫／表格，必須喺 **Shortcuts** 加入 Numbers 動作先會同步。你之前截圖見到嘅 `Run Expense with 回應` 只負責執行 Scriptable，並唔等於已經加入 Numbers 表格。

### 1. Numbers 表格準備
喺 Numbers 建立（或者選用）一個表格，**按以下順序**設立六欄：

`Date | Card | MerchantName | MerchantType | Currency | Amount`

可命名為 `Transactions`。第六欄 Amount 應設成數值，第一欄可以先採用文字，以保存 `YYYY-MM-DDTHH:mm:ss` 日期及時間。你的真正檔名／Table 名稱需喺 Shortcut 明確選擇。

### 2. Shortcuts 依序加入（在「Run Expense with 回應」之後）
1. **Get Dictionary Value / 取得字典值**：由 **Run Expense 的輸出** 取得 `shouldAppendNumbers`。
2. **If / 如果** 值係 true：
   - **Get Dictionary Value / 取得字典值**：由同一個 **Run Expense 輸出** 取得 `numbersRow`（六元素 List）。
   - **Numbers → Add Row to Top or Bottom of Table**：選已存在嘅 Numbers 檔案、工作表及 Table，選擇 **Bottom**，將 Values 設為上一步嘅 `numbersRow` List。若你的 Shortcuts 版本唔接受一整個 List，就將六個欄位逐一設入 Numbers 動作的 Values。
3. **Get Dictionary Value / 取得字典值**：由 **Run Expense 輸出** 取得 `receipt`，接 **Show Result / 顯示結果**。
4. 如果 `requiresBatchSync` = true，代表一次匯入超過一筆；應用 Repeat with Each `numbersRows`，不能只寫第一筆。

### 3. 入帳判定
Script 回傳例如：

```json
{
  "version": "3.8.0",
  "status": "saved",
  "receipt": "[EXPENSE-HK-v3.8.0] 已儲存 1 筆...",
  "shouldAppendNumbers": true,
  "numbersRow": ["2026-11-04T20:33:28","SAMPLE CARD","Example Cafe","餐飲","HKD",57],
  "numbersRows": [["2026-11-04T20:33:28","SAMPLE CARD","Example Cafe","餐飲","HKD",57]],
  "requiresBatchSync": false,
  "transactionId": "external:...",
  "localStored": true
}
```

*以上係虛構測試交易。* `status:duplicate`、`skipped` 或 `error` 時，`shouldAppendNumbers` 為 false，不應新增 Numbers 行。

**一致性注意：** Numbers 插入係獨立嘅 Shortcuts 動作，未能同 Scriptable 本機 JSON 寫入形成原子交易。若後面 Numbers 動作失敗，本機可能已儲存，不能單純重新掃卡期待重複匯入會自動補返 Numbers；請先手動核對，避免重複或漏帳。以前保存嘅交易唔會自動同步到 Numbers，可由 Scriptable 匯出 CSV，再用 Numbers 小心導入核對。


## v3.8.1 Shortcut 執行診斷
1. 將最新整份程式複製去 iPhone Scriptable 裏面 Shortcuts 所選用嘅 `Expense` 腳本。
2. 跑一次自動記帳 Shortcut，再直接喺 Scriptable 開 `Expense` → 🧪 **查看 Shortcuts 記帳紀錄**。
3. `未有 Shortcuts 執行紀錄` = 沒有證據表明新版腳本執行；`no_input` = 冇收到 Shortcut Parameter；`skipped` = 解析唔到有效金額；`saved` = 已寫入及讀回；`error` = 執行失敗。
4. 檔案只儲存輸入類型、執行狀態及數量，唔包括真實交易原文。

## v3.9.0 — Dashboard 編輯交易
喺 Scriptable 入面進入 Expense → Dashboard，按每行「✏️ 編輯」，可修改日期／時間、商戶、類別、貨幣、金額（非零，負數代表退款）同卡名；儲存後修改原本 transactions.json 同一筆記錄，再讀回驗證，更新 Dashboard 圖表。列表可搜尋全部交易。若 WebView 編輯按鈕喺某版本 iOS 不生效，可由 Scriptable 主選單選「✏️ 編輯交易」作後備入口。

**注意：** 本機資料更新不會修改之前另外新增至 Apple Numbers 的行；必須另行核對。若交易期間被另一個 Shortcut 改動，會拒絕覆蓋；取消編輯及沒有改動時不會寫入。

## v3.10.0 — 左滑刪除
喺 Dashboard 交易卡片向左滑動，會露出紅色「刪除」；點擊再經原生確認才會真正刪除。向右滑可收起；如無法滑動，按「⋯」或者主選單「🗑️ 刪除交易」。刪除只更新本機 transactions.json，會先檢查有冇較新改動，寫入 previous 備份並讀回核對。Apple Numbers 既有行及之前嘅備份唔會自動刪除。

## v3.11.0 — 手動輸入（非 Tap Card 交易）

打開 Scriptable → Expense → **➕ 手動記帳**，或 Dashboard 頂部按 **＋ 手動記帳**，即可見深色手動記帳介面。左／右箭嘴選日期、點日期揀日子、輸入商戶／記錄、有效非零金額、交易時間、付款方式、貨幣，並選擇一個彩色分類圖示。按「儲存支出」會新增至同一份 `ExpenseTrackerHK/transactions.json`，再讀回核實，成功後重設表單。負數退款可以記錄、0／空白跳過；外幣先儲存原幣，之後按主選單「重試外幣換算」。

表單資料只會由 Scriptable 從本機 WebView 讀取；操作用固定 URL 訊號，唔會把金額、商戶或卡名放入網址。Apple Numbers 需要獨立 Shortcut 寫入，**手動記帳唔會自動增加 Numbers Table 行**。iPhone WebView 真正按鍵體驗需實機驗證。

## v3.11.1 — 修正 Scriptable 開 App 錯誤
已修正 v3.11.0 漏咗 `dashboard()` 同 `addManual()` 函式，導致主選單報 `Can't find variable: dashboard`。新版本已實際模擬從主選單開啟 Dashboard、手動記帳頁及 Dashboard 深層連結；資料庫及 Widget 邏輯不變。請將 GitHub 最新整份程式完全覆蓋 Scriptable 內既有 `Expense.js`；唔好喺舊程式後面追加。

## v3.11.2 — 手動記帳 UI 修正

手動記帳頁頂部依家預留 iPhone 狀態列／Scriptable WebView 工具列空間；日期只保留一個可點選欄位，點按會直接開原生日期選擇器。支出金額／幣種、時間／付款方式重新排版，十二個分類縮細以增加顯示範圍，底部儲存按鈕亦調整為較緊湊尺寸。**原有記帳資料及自動記帳流程不受影響。**

## v3.11.3 — 主畫面一鍵開手動記帳（不改 Tap Card 自動化）

**用法 A — iPhone 主畫面圖示（建議）：**
1. 更新手機 Scriptable 內的 `Expense.js` 至 v3.11.3。
2. 打開 Scriptable 執行 `Expense`，喺主選單揀 **🔗 複製一鍵記帳網址**；會自動使用手機上正確腳本名稱。
3. 開 iPhone「捷徑」App，新建捷徑命名 **快速記帳**：加入 **URL** 動作並貼上已複製連結，再加入 **開啟 URL / Open URLs** 動作，輸入選前一步 URL。
4. 喺捷徑詳細資料選 **加入主畫面 / Add to Home Screen**。之後撳一下新圖示就會直接打開手動記帳表單，唔使經主選單或者 Dashboard。

直接網址例子（腳本喺 Scriptable 名為 `Expense`）：

```text
scriptable:///run?scriptName=Expense&view=manual
```

**用法 B — 另一個 Scriptable Widget：** 喺主畫面加多一個 Scriptable Widget，選同一個 `Expense` Script，於 Widget Parameter 輸入 `quick`。新 Widget 一撳就開手動表單；舊 Widget 冇填 Parameter 仍然開 Dashboard。

**兩條流程互不影響：** Apple Wallet Tap Card Automation 保持原本「使用裝置端模型 → Run Expense with 回應」設定，毋須修改。自動傳入有效 Dictionary 仍然優先執行自動入帳；URL `view=manual` 只用於冇傳交易輸入嘅互動開啟。兩者都存入本機 `ExpenseTrackerHK/transactions.json`。一鍵係開啟表單，並非唔輸入金額就能自動記帳。

## v3.11.4 — 一撳即開手動記帳（新建獨立 Shortcut）
之前用 `URL → 開啟 URL` 可能只會打開 Scriptable App，但冇執行到表單。新版最可靠嘅入口改用 **Scriptable 原生 Run Script**，指定腳本及文字參數：

1. 先將 GitHub 最新完整程式貼入 Scriptable 嘅 `Expense` 腳本。
2. 喺「捷徑」新建一條「快速記帳」，加入 **Scriptable → Run Script**，選 `Expense`。
3. 點 **Parameter**，設為普通文字 **`EXPENSE_QUICK_MANUAL`**（唔係 URL，唔係 Magic Variable）。
4. 喺同一動作把 **Run In App 開啟**。此功能必須在 Scriptable 前景顯示互動 WebView；如果關閉會收到 `quick_requires_app` 錯誤提示。
5. 不需要 URL、Open URLs、AI 模型或 Show Result 動作。把「快速記帳」加入主畫面，一按直接開手動表單。

**絕對唔好改原本 Tap Card Automation：** 仍然係「使用裝置端模型 → Run Expense with 回應」，其 Parameter 保留交易 Dictionary，Run In App 可以繼續依原設定。兩條 Shortcut 都使用相同嘅 `transactions.json`，但唔共享入口參數。

## v3.11.5 — 修正快捷記帳 `Texts` 同 `Parameter` 分別

你嘅 iPhone 截圖顯示，Scriptable「Run Expense with Parameter」入面 **Parameter 其實係空白**，文字 `EXPENSE_QUICK_MANUAL` 被加到展開嘅 **Texts** 一欄。呢兩個輸入分別會去 `args.shortcutParameter` 和 `args.plainTexts`。新版 v3.11.5 兩者都支援：**直接保留你截圖中 Texts 的指令、Run In App 保持 ON**，重新執行即可試進入手動表單；亦可以刪除 Texts，改為喺上面 Parameter 傳入同一文字指令。

為咗保護原本 Tap Card Automation，只有 `Parameter` 冇資料而 `Texts` **恰好一項非空白文字**等於指令，先會轉成快速記帳；如 `Parameter` 已有 Wallet/AI 交易 Dictionary，仍然優先入帳。呢個功能只打開表單，輸入有效金額後先會寫入原本 JSON。

## v3.12.0 — Merchant Type／付款類型／Remark

Merchant Type 固定 12 個：**食物、飲品、娛樂、日用品、交通、旅行、衣服、水電、醫療、訂閱、進修、運動**。Dashboard 本月分類會列齊 12 格，冇數值嘅格保持空白；按分類可篩選交易。原有「餐飲」顯示為「食物」、「健康醫療」顯示為「醫療」、「超市雜貨」顯示為「日用品」，但 **唔會批量改寫舊交易資料**；未能確定嘅舊類別保留喺其他／未分類。

付款類型另設 `paymentType`，例如 **信用卡、扣賬卡、現金、八達通、轉數快、銀行轉帳、電子錢包、其他**，而 `card` 原樣保留具體卡名（例如 SOGO VISA SIGNATURE CARD）。唔肯定的付款類型可空白。手動記帳可填 Payment Type、Card 及 Remark；編輯交易時亦可隨時修改。Dashboard 新增付款類型統計／付款類型篩選／卡名篩選／類別篩選，以及包含備註文字嘅搜尋。CSV 匯出會喺舊 15 欄後追加「付款類型」同「Remark」。

舊版 Tap Card 6-key Dictionary 仍然可以直接傳入，另外亦支援可選的 `paymentType`、`remark`。Apple Numbers 原本 6 欄仍然照舊；本機增補／編輯唔會自動改 Numbers 已存列。

## v3.13.0 — 手機版 Dashboard 重整及動態付款類型

新版 Dashboard 頂部預留原生 WebView 狀態列/工具列空間，將 12 類別、付款方式、交易列表及 Remark 搜尋排喺圖表前；14 日／6 個月趨勢改成緊湊切換式，冇數值會顯示短提示。分類冇交易，金額留空。系統狀態、分類圓環可自行展開。

**Payment Type 無固定白名單：** Payme、AlipayHK、Apple Pay 或其他自訂文字均可顯示同搜尋；`Card` 仍然分開保存。編輯同手動輸入可以自行輸入付款方式，不必揀固定選項。**`MerchantType: 食飯` 會顯示為「食物」**，原始類別保持不變。舊交易 JSON 不批量轉換，Tap Card Automation 同原有 Numbers 六欄輸出唔變。

### iPhone 更新
1. 用 GitHub 最新 `widgets/expense-tracker/HK-Expense-Tracker.js` 完全覆蓋 Scriptable 內的 `Expense.js`。
2. 重新開 Dashboard，核對頂部冇遮擋、付款方式保留 Payme、食飯歸入食物、Remark 可搜尋。
3. 照舊使用 Tap Card／快速記帳；毋須重建交易資料庫。

## v3.14.0 — 12 類正式名稱「食飯」＋ Dashboard 重新設計

**正式 Merchant Type 已由「食物」更新為「食飯」**。舊「食物／餐飲／Restaurants」會喺 Dashboard、交易搜尋、手動輸入顯示為「食飯」，但本機舊交易 `category` / `originalCategory` 不會強行改寫，避免破壞歷史資料。同時保留原本 12 個類別及 Payme 等自訂付款方式。

介面採用簡潔深色財務風格：本月主金額卡、今日/近七日副指標、前三類水平比較條、帶圖示及微型進度條的 12 分類、動態 Payment Type 卡、交易搜尋／備註／編輯／左滑刪除，以及可切換 14 日／6 個月趨勢。**參考 100 個設計、手機 UX 及無障礙來源頁面**，詳見 [100 Sources Dashboard Research](EXPENSE_DASHBOARD_RESEARCH_100.md)；其中核心設計結論和標準規格有清楚區分。

沿用同一個 `Expense.js`、`ExpenseTrackerHK/transactions.json`，唔改 Tap Card Shortcut Parameter 六欄輸入、原有 Apple Numbers 六欄連動或額外開雲端。

## v3.15.0 — 依尺寸逐層增加 Widget 資訊／程式碼清理
- **Small：** 本月、今日、交易數，唔放圖，手機一眼睇清。
- **Medium：** 多 14 日趨勢、近七日同最多消費分類。
- **Large：** 再多前三分類、前兩付款方式同最新兩筆交易。
- **Extra Large：** 只限 **iPad**，30日加6個月兩張圖、前五分類、前三付款方式、最近六筆交易同退款數。
- **共用計算：** 依賴單次帳本掃描；保留負數退款、有效 HKD、外幣待換算及自訂 Payme 等付款方式。`transactions.json` 不需移轉，Tap Card 自動記帳不需更改。
- **資料完整性：** 修正 `__proto__` 自訂名稱可能引發嘅物件 key 問題；支出／退款打平 HK$0 嘅活躍分類仍能顯示。
- **研究：** 參考重新核實過嘅 Apple WidgetKit／HIG、Scriptable API 同 W3C，詳見 [完整 Code Audit & Research](EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md)。

### 正確預覽
更新手機 Scriptable `Expense.js` 全檔後，執行 Script → 選「👀 預覽 Widget 尺寸」。當 Scriptable 安裝喺 iPad，選單先會顯示 Extra Large。iOS 系統可能延遲 Widget 自動刷新，唔好將 `refreshAfterDate` 視為精準刷新時刻。

## v3.16.0：Small Widget 七日圖恢復
**已修正 v3.15 小 Widget 錯誤刪除近7日圖表嘅功能退步。** Small 現在提供月淨支出＋今日＋近7日合計＋7條每日淨支出柱＋7個原生星期文字標籤＋本月交易數（或 FX 待核對警告）；所有新 Small Widget 原生文字 11pt 或以上。

研究重做：[100 個來源＋專家比較＋不確定性](EXPENSE_WIDGET_RESEARCH_100_V3_16.md)。數值全部用原有 `amountHKD`，退款保留負值，FX pending 不混入 HKD；**無資料庫遷移，Tap Card、Shortcut、Numbers 格式不變。**

更新：GitHub 取最新 `widgets/expense-tracker/HK-Expense-Tracker.js` 覆蓋 Scriptable `Expense.js`，App 主選單「👀 預覽 Widget 尺寸」檢查 Small 及其他支援尺寸。確認狀態列、圖表及星期標籤冇裁切。


## v3.17.0 — Small/Medium/Large/Extra Large 全面重做
- **Small：** 修正 HK$200.30 同一數值連續三次顯示，保留近七日每日柱圖＋原生星期，避免過度縮字。
- **Medium：** 主金額、今日、七日放左邊；14日圖放右邊；下方最多分類／付款方式。
- **Large：** KPI 卡＋14日圖＋左右分析欄，分別有前三分類及前兩付款方式／最近兩筆交易。
- **Extra Large：** Scriptable iPad 30日與6個月雙趨勢、前五類別、前三付款、三欄六筆交易；手機是否可用仍取決於 Scriptable 對 OS 的 family 支援。
- **資料：** 全部沿用本機 JSON、付款名稱、Remark、Tap Card、快速記帳、FX 與 Apple Numbers 接口。
- **報告：** [完整視覺重新設計、官方來源及短螢幕高度測試](EXPENSE_WIDGET_VISUAL_REDESIGN_V3_17.md)。

## v3.18.0 — Screenshot-first 重新設計
新版以真實 iPhone 小／中／大 Widget 三張畫面為驗收起點，主要改正 Large 空間浪費、Medium 金額重複及 Small 「等額就代表全部在今日」的錯誤推論。Large 把最近交易移到全寬，重點顯示最多 4 筆、分類比較、付款分布與「其餘金額」；Medium 顯示 14 日活躍日數和最重要分類／付款；Small 保留七日圖和星期標籤。iPad XL 亦用更精準的日期描述，不假稱已完成 iPad 實機測試。

已加 regression cases：HK$200.30 單日四筆、跨日退款令月／今日同額、付款 Top 2 其餘 HK$15.30、商戶名稱為 null 顯示類別／付款而不覆蓋舊資料。**104 個新增設計索引及根因報告**：[read here](EXPENSE_WIDGET_SCREENSHOT_RESEARCH_104_V3_18.md)。
## v3.19.0 — 從零重建四種 Widget 介面
Small 改為有數據含意嘅七日熱度條；Medium 根據一個／多個有交易日自動切換「分類／趨勢」；Large 改成全寬大字資訊而非窄卡；Extra Large 係真正三欄分析控制台。請避免使用舊版 Widget 的分支 patch，更新完整主 Script；詳情：[v3.19 設計研究](EXPENSE_WIDGET_RESEARCH_V3_19.md)。
