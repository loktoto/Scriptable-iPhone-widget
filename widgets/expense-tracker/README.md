# Expense Tracker HK | 記帳 Widget

**Main:** [HK-Expense-Tracker.js](HK-Expense-Tracker.js)  
**Read-only diagnostic:** [HK-Expense-Input-Diagnostic.js](HK-Expense-Input-Diagnostic.js)  
**Current version:** [3.21.0](VERSION.json) · [Release notes](CHANGELOG.md)

- Apple Intelligence / Shortcuts Dictionary, nested `amount.content`, regular JSON, constrained key-based text extraction.
- Save valid nonzero amounts only. Negative transactions are refunds; other missing fields may still be saved.
- After saving, re-open `transactions.json` to verify persistence and return a marked `[EXPENSE-HK-v3.16.0]` receipt.
- Adaptive Small / Medium / Large / iPad Extra Large widgets, category charts, recent transactions, optional FX reference conversion, CSV and JSON export.
- Local Scriptable data only. **Never publish your real transaction CSV, JSON, card information or AI text to this public repo.**

[Installation / 安裝](../../docs/EXPENSE_TRACKER.md) · [Synthetic example JSON](../../examples/expense-transaction.example.json)

A GitHub update never changes an already installed iPhone Scriptable script; reinstall the updated source manually after each release.

**Shortcuts reliability (v3.7.1):** Imports save and verify without waiting for historical FX requests. Pending foreign currency can be converted with **Retry FX** in the Scriptable app.

**Apple Numbers bridge v3.16.0:** Run Expense returns a Dictionary. Shortcuts must then use `shouldAppendNumbers` and `numbersRow` to append one row to a chosen Numbers Table. See [Numbers setup](../../docs/EXPENSE_TRACKER.md#apple-numbers-data-table--apple-numbers-表格寫入-v380).

**Execution audit (v3.16.0):** Open this installed script in Scriptable → 🧪 查看 Shortcuts 記帳紀錄. Local, private `ExpenseTrackerHK/last-shortcut-run.json` shows whether the Shortcut was invoked and how far it reached.

## Edit Dashboard transactions (v3.16.0)
Open the Dashboard and use the Edit control on any row, or choose the Scriptable app-menu Edit Transaction fallback. The editor validates amount and date, retains the transaction ID, saves back to local JSON and refreshes Dashboard. **Existing Apple Numbers rows are not updated.**

### Swipe left to delete (v3.16.0)
Dashboard transaction cards support swipe-left → red Delete button → native confirmation, swipe-right to close, plus a ⋯ button and in-app deletion fallback. Local JSON is backed up and read-back verified; Apple Numbers and older backup copies are not altered.

### Visual manual expense entry (v3.16.0)
Choose **➕ 手動記帳** in Scriptable or **＋ 手動記帳** in the Dashboard to enter cash, Octopus, FPS and bank-transfer transactions using a dark 3-column icon category grid, day navigation, amount, time, payment source and currency. Saves to the existing local JSON ledger, with nonzero validation, FX pending state, duplicate prevention and disk verification. Manual entries are **not** added to Apple Numbers automatically.

### v3.16.0 — App entry point hotfix
Dashboard and Manual Entry now both work through the same `presentExpenseWeb` controller. v3.11.0 was missing their required wrapper functions and could crash with `Can't find variable: dashboard`. Existing local transaction files are unaffected. Full Scriptable app-route regression tests now run in CI.

### Manual form compact layout — v3.16.0
The mobile manual form now reserves space for iOS native WebView chrome, shows only one date field, uses tighter category cards, reduces the sticky Save bar and keeps time/payment controls separated. No input or storage schema migration is required.

### Home Screen one-tap manual entry (v3.16.0)
Run `scriptable:///run?scriptName=Expense&view=manual` (replace `Expense` with your actual URL-encoded Scriptable script name) from a separate iPhone Shortcut **Open URL** action and **Add to Home Screen**. To avoid typing the URL, open the normal Expense Scriptable app menu and choose **🔗 複製一鍵記帳網址**. The regular Tap Card automation is unchanged. Optional: add a separate Scriptable widget using the same script with **Widget Parameter = quick**; this widget launches the form, while your original widget still opens Dashboard. The user must still enter an amount before saving.

### Recommended one-tap launch (v3.16.0)
Create a **separate iOS Shortcut** containing just Scriptable **Run Script**, select the script **Expense**, set **Parameter** to text `EXPENSE_QUICK_MANUAL`, and turn **Run In App ON**. Add that Shortcut to the Home Screen. This opens manual entry directly and does not affect the existing Tap Card automation. If Run In App is off, the script returns `quick_requires_app` instead of trying to present a WebView. The URL route remains an alternative, but it depends on iOS URL handoff and the exact Scriptable script name.

### One-tap Shortcuts Texts support (v3.16.0)
In a standalone Shortcuts **Scriptable → Run Script** action, select Expense, enable **Run In App**, and put the exact command `EXPENSE_QUICK_MANUAL` in **either** the main Parameter field **or** as the **only item in Texts**. Both now launch the manual form directly. This fixes the reported UI where Parameter was empty but Texts held the command. Do not alter the separate Tap Card automation: real Wallet Dictionary input remains the priority.

### Merchant / payment / Remark Dashboard (v3.16.0)
A fixed 12-category Merchant Type overview (empty categories show blank values), clickable type filters, payment-method summary, and category/payment/card dropdowns now accompany free-text search across merchants, **remark**, payment types, categories and dates. The existing `card` string remains distinct from a new optional `paymentType`; the manual WebView has both inputs plus an optional Remark. Old transactions are displayed with non-destructive compatibility aliases; no bulk rewrite is performed. CSV adds payment type + remark at the end; the older six-column Apple Numbers bridge stays unchanged.

### v3.16.0 — Mobile Dashboard + flexible payments
The Dashboard reserves iPhone WebView top chrome, uses compact KPI cards, collapsible diagnostics/donut, 12 clickable categories, actual payment names, and transaction search/edit/delete before a compact switchable 14-day/6-month chart. Unavailable chart periods no longer leave huge blanks. The user-provided legacy `MerchantType: 食飯` displays as 食物; `Card: Payme` displays Payme, keeping source data unchanged. Payment Type is a free-text field with optional suggestions, not a fixed whitelist. Tap Card and Numbers integrations remain compatible.

### v3.16.0 — 食飯 + research-led premium dashboard
The canonical food Merchant Type is **食飯** throughout the Dashboard, manual UI and editor. Previously stored 食物/餐飲/Restaurants values remain readable and map to 食飯 for display; existing JSON rows are not rewritten. The Dashboard has a focused monthly spend hero, compact summary cards, refined accessible 12-category tiles with mini bars, top-category rankings, payment cards for dynamic wallet labels, and refined transaction rows. **100 independent guideline/reference pages** are indexed, categorized and linked in [Dashboard Research](../../docs/EXPENSE_DASHBOARD_RESEARCH_100.md) (100 sources != 100 empirical studies). No third-party assets or telemetry. Tap Card, Shortcuts, edit/delete, the original local ledger and Numbers bridge remain unchanged.

## v3.16.0 — 四個真正不同嘅 Widget / Four real information tiers
**iPhone：Small、Medium、Large；iPad：另有 Extra Large。**
| Family | What you see |
|---|---|
| Small | 本月淨支出、今日支出、本月交易數；唔再重複放縮細圖 |
| Medium | 本月／今日／近7日＋14日走勢＋最多支出類別 |
| Large | 14日圖＋前三分類＋前兩付款方式＋最近兩筆交易 |
| Extra Large (iPad) | 30日每日／6個月月度雙圖、前五類別、前三付款方式、最近六筆交易、退款及待核對數 |

**預覽方式：** Scriptable 開 `Expense.js` → 主選單「👀 預覽 Widget 尺寸」，iPhone 可預覽 Small/Medium/Large，iPad 可額外預覽 Extra Large。**Extra Large 不能強行安裝到 iPhone。** 30 分鐘 `refreshAfterDate` 係最早可刷新偏好，唔係每 30 分鐘準時執行嘅承諾。保留 `Widget Parameter = quick` 快速記帳入口及同一份 `transactions.json`。

研究與 code audit：[`EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md`](../../docs/EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md)。

## v3.16.0：Small 七日圖恢復，資料密度與可讀性兼得
Small 不再只得月結總額：顯示 **本月淨支出、今日淨支出、近7日總額、七條每日淨支出柱、七個原生星期文字標籤**、本月記錄數（或待核對警告）。小 Widget 用 11pt 以上原生文字、20pt 金額，圖用 DrawContext 30pt 高。避免硬塞七個微小金額字串。

Medium 仍顯示 14 日趨勢及最多支出分類；Large 仍顯示付款方式／分類／交易；iPad Extra Large 仍保留 30 日＋6 個月雙圖。保留 Tap Card、Quick Entry、資料庫及 Numbers 原樣。

[完整 100 Sources 獨立研究與 v3.15/v3.16 對照](../../docs/EXPENSE_WIDGET_RESEARCH_100_V3_16.md) — 100 個可追溯來源頁面，研究報告區分直接證據與參考來源，實機視覺效果仍須裝置預覽確認。


## v3.17.0 — Small / Medium / Large / iPad Extra Large 全面重設
Small：22pt 主金額＋7日柱圖＋7個原生星期字；同額（例如本月＝今日＝近7日）唔再顯示三次 HK$200.30，而係以「本月全部」「1日有紀錄」解釋。Medium：左 KPI／右14日圖，底部類別及付款方式。Large：主 KPI、14日圖、雙欄分類／付款／交易。iPad XL：30日及6個月分析、五類別、三付款方式及三欄六筆交易。**所有尺寸已重做，唔再只改 Small。**

**安裝：** 用最新 `widgets/expense-tracker/HK-Expense-Tracker.js` 完整覆蓋 Scriptable `Expense.js`，執行「👀 預覽 Widget 尺寸」逐一檢視，保持原本 Widget 關聯 script 名稱。冇改 Tap Card、transactions.json、Numbers 或 FX。

[研究與 Screenshot Root Cause](../../docs/EXPENSE_WIDGET_VISUAL_REDESIGN_V3_17.md)

### v3.18.0 — 真實截圖問題全面修正（Small／Medium／Large／iPad XL）
先檢查使用者提交之 PDF 三張 Widget 實際畫面：Large 下方長空白、兩張窄卡文字難讀；Medium 同一 HK$200.30 出現 3 次；Small 七日圖需兼顧清晰與空間。今次 Large 提供**全寬最多四筆最近交易**，Medium 加入**14 日活躍日數＋最重要分類／付款方式**，而 Small 依據**實際交易日期**判斷是否「全部在今日」；另有 Ipad XL 改善。版面按稀疏／非稀疏資料自動縮放；付款方式 Top 2 之外會顯示「其餘」真正金額。全部沿用同一交易資料庫同 Shortcut。

[104 新來源＋實機截圖根因及驗收清單](../../docs/EXPENSE_WIDGET_SCREENSHOT_RESEARCH_104_V3_18.md)（索引不是 104 項獨立實驗）。
### v3.19.0 — Widget 全尺寸由零重建

- **Small：** 本月淨支出＋最高支出類別佔比＋真正七日每日消費熱度條（七個原生星期字），唔再出現孤零零一條過高紫柱。
- **Medium：** 近十四日只有一個有交易日，改顯示真實兩大分類及常用付款方式；若有多個活躍日，自動切換成 14 日趨勢。
- **Large：** 全寬分類、付款及最近交易，精簡 14 日淨額圖。細機減少列數，唔靠硬縮細文字。
- **Extra Large（iPad）：** 真正三欄報表、30日及六個月圖、五大分類／四付款方式／六筆交易。
- **Data：** 沿用同一個 `ExpenseTrackerHK/transactions.json`、負數退款、Payme、自訂付款名稱、食飯、Remark、Tap Card、Shortcut、原本 Numbers 六欄。
- **Debug / Preview：** Scriptable → `Expense.js` → 「👀 預覽 Widget 尺寸」，逐一比較各個尺寸。本版本改動設計及視圖邏輯，無需資料庫遷移。

研究及可驗收標準見 [Clean-sheet Widget Design](../../docs/EXPENSE_WIDGET_RESEARCH_V3_19.md)。


## v3.20.0 — Charts-first, all 4 Widget sizes
- Small: 本月 HKD 淨額＋7日每日 signed 柱圖＋最多分類百分比。
- Medium: 14日淨額圖＋分類組合比例條，兩張獨立圖表。
- Large: 14日柱圖＋分類環形圖＋付款分佈堆疊比例圖，另保留最多2筆最近交易。
- iPad Extra Large: 30日每日圖＋6個月圖＋分類環形圖＋付款分佈圖，另最多六筆交易（細 iPad 三筆）。
- **分母要分開：** 月額係扣退款後淨支出；環形及堆疊比例圖係未扣退款嘅正向支出，絕不以負數計算百分比。待換算外幣唔計入 HKD。
- 原有 Tap Card、Shortcut、Expense.js 名稱、本地 transactions.json、Payme、自訂付款、Remark、編輯／刪除、Numbers 六欄全部保留。

[研究、同類產品視覺對照、圖表語義、尺寸驗收規格](../../docs/EXPENSE_WIDGET_REDESIGN_V2_V3_20.md)。


## v3.21.0 — 實機截圖主導的稀疏圖表修正
Small 7個原生星期字及有效記帳日熱度；Medium 兩類別名／佔比而唔係被截短付款名稱；Large 退款前比例標籤、較清楚付款條及3筆最近交易（窄屏2筆）；iPad XL 30日／6個月圖按資料密度動態轉為記帳日時間線。
- <=2 個記帳日期：顯示**等高活動日期標記**，標題明確表示「有幾日記帳」，唔再用巨大單柱傳達只有一天的金額。
- >2 個記帳日期：保留 signed HKD 金額圖及原生分類／付款構成圖。
- 保留同一個 Expense.js、transactions.json、本地資料、Shortcut / Tap Card、進階手動記帳、12分類及 Remark，**不需資料庫遷移**。

[完整第三方產品核實、圖表規則與截圖驗收報告](../../docs/EXPENSE_WIDGET_RESEARCH_AUDIT_V3_21.md)
