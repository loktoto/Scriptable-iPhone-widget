# Expense Tracker HK v3.5｜記帳 Widget / Shortcuts Guide

> Script: [scripts/HK-Expense-Tracker.js](../scripts/HK-Expense-Tracker.js)  
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
2. 複製 [HK-Expense-Tracker.js](../scripts/HK-Expense-Tracker.js) **全部內容**貼入新 Script（不要追加在舊程式後）。
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
1. Install [Scriptable](https://apps.apple.com/app/scriptable/id1405459188), create a new script, and paste the entire [HK-Expense-Tracker.js](../scripts/HK-Expense-Tracker.js) file.
2. Run it once in Scriptable for the menu and widget previews.
3. In Shortcuts, have Apple Intelligence emit a Dictionary with `merchantType`, `merchantName`, `currency`, `amount`, `card`, and `date`.
4. Pass that Dictionary directly into Scriptable **Run Script → Shortcut Parameter**. No conversion to JSON text is necessary.
5. Configure a home-screen Scriptable widget to use the same script.

### Privacy and limitations
This public repository contains **code and synthetic JSON examples only**. Do not commit your real transaction database, exported CSV or backups. FX rate lookups send the currency pair and date only. Widget reload timing is controlled by iOS; `refreshAfterDate` is not a guaranteed refresh interval. Live iPhone execution should be validated separately from JavaScript tests.
