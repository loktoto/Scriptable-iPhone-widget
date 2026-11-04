# Expense Tracker HK v3.7.1｜記帳 Widget / Shortcuts Guide

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
