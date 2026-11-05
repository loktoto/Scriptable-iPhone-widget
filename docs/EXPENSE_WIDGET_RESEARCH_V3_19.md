# Expense Tracker — Clean-sheet Widget Architecture v3.19.0

**2026-11-05 · 實機截圖問題導向 · 沒有資料庫遷移**

## 1. 點解 v3.18.0 要推倒重做

根據用戶提供嘅 Small 截圖（11月、HK$200.30、4筆交易），舊版存在幾個肉眼可見問題：

- 大數字佔據上半，對應嘅「全部在今日」「近7日1日有紀錄」冇增加多少解釋力。
- 同一日只有一筆（或同日數筆）支出，直方圖只留下**一支過高紫色柱**，其餘六日近乎空白，視覺失衡。
- Small 的灰底線、七個大星期字同上面兩行說明互相爭注意力，既唔似 iOS 原生金融 Widget，也未能高效傳遞支出。
- Medium 的單日 14 天空圖同樣缺乏價值；Large 則由多個細而窄嘅子卡導致難讀，交易資訊遠比空白少。

**這些是用戶實機畫面觀察，不係推測。** 但未有用戶提交 Extra Large iPad 真機畫面，所以無法聲稱已完成 iPad 視覺驗收。

## 2. 重新核實嘅第一手設計原則

| 官方來源 | 可直接採用的設計要求 | 實作 |
|---|---|---|
| [Apple Widgets HIG](https://developer.apple.com/design/human-interface-guidelines/widgets) | Widget 必須 glanceable，字一般不少於 11pt，避免不必要的視覺裝飾；尺寸越大內容可以越豐富 | Small 一個金額焦點，Medium 多一層分析，Large 全寬多區塊，iPad XL 三區 |
| [Apple Layout HIG](https://developer.apple.com/design/human-interface-guidelines/layout) | 排序、對齊、群組及層級應由主要到次要 | 採左對齊 Native Text，統一間距、用短標籤和數字 |
| [Scriptable ListWidget](https://docs.scriptable.app/listwidget/) | Native stack/text/draw context；可獨立預覽四種 family | 不新增 WebView、外部圖片或第三方字體 |
| [Scriptable WidgetStack](https://docs.scriptable.app/widgetstack/) | 原生容器可設定背景、size、padding、cornerRadius | 只有有意義的分析區才使用卡片背景 |
| [USWDS Data Visualizations](https://designsystem.digital.gov/components/data-visualizations/) | 根據要回答嘅問題揀圖，圖表需要清楚上下文 | 日數太少不用佔大量面積畫長期趨勢 |
| [GOV.UK Summary List](https://design-system.service.gov.uk/components/summary-list/) | 簡單、清晰配對 label/value | 分類、付款和最近交易均保留 Native Text |
| [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 顏色不可以是唯一訊息載體，文本對比及可讀性重要 | 同時呈現幣值及可讀分類名，不靠紫色高柱代替金額 |

上一輪建有 [104 個額外官方參考頁索引](EXPENSE_WIDGET_SCREENSHOT_RESEARCH_104_V3_18.md)，但**大量為設計系統組件索引而非逐頁深讀的實證文獻**。本次實作以與 Widget 有關的可核實第一手原則和用戶截圖為主，並不為追求來源數字而虛報深入研究。

## 3. 全新 UI family 資訊架構

| Family | 重點資訊 | 資料圖形 | 具體意義 |
|---|---|---|---|
| Small | 本月金額、交易數、最大分類及其正向支出佔比 | **七日橫向熱度條**、七個原生星期字 | 七日每天數據仍在，但每日色塊並列，唔再有單支巨大紫柱 |
| Medium | 本月金額、交易日數、兩大類別／常用付款 | **自適應**：只有 ≤1 個活躍日→分類比較；多日→14日淨額微圖 | 唔為空白走勢圖浪費畫面 |
| Large | 月額、14日趨勢、Top2–3 分類、Top1–2 付款方式、最近2–4筆交易 | 淺 14 日 signed bar + 分類比例 | 資訊全寬、文字≥11pt、按裝置減少行數 |
| Extra Large | 月額／退款、30日圖、6個月圖、Top5 分類、Top4 付款方式、最近6筆交易 | 獨立三區分析版面 | 只在 iPad Scriptable Extra Large 生效，不只是手機放大 |

### 為什麼七日熱度條比舊 7 天柱形圖合理？
- 單日有記錄時，舊 1 支大柱佔大部分圖面，容易過度凸顯個別日期。
- 新 7 個等寬色塊可以直觀睇出活躍日，深色表示 0，紫色有淨支出，綠色有淨退款；有多個支出日時，填滿比例依據絕對 HKD 金額。
- 唔將 0 支出當作無紀錄的保證：如果某日剛好一筆消費加一筆退款淨額零，圖形仍顯示淨額零。活躍日數獨立由交易日期計算，避免混淆。

## 4. 資料準確性與守護條件

- **只接受非零有效 amount** 入帳；0、`""`、null 跳過，負數退款有效（沿用入帳功能）。
- HKD 卡片／圖只加總日期有效且已換算成 `amountHKD` 嘅交易。Pending FX 不被誤當港元零元；並保留待核對資訊。
- `monthOnlyToday` 是交易數與日期匹配，不會由相同淨金額推斷全部在今日。
- 多付款方式使用原本字串（例如 Payme、Online Payment、SOGO VISA）。只在非常狹窄的 Widget 上用字元省略號；資料庫不截斷。
- 沒有商戶名稱只在 Widget 顯示「Merchant Type · PaymentType」，不回寫猜測商戶。
- 取消淨額為零的活躍分類不能被當作「本月冇交易」刪除。
- 保留原本 Shortcut Parameters、Expense.js script name、`ExpenseTrackerHK/transactions.json`、Numbers 六欄、FX 與 edit/delete 功能。
- 30 分鐘 `refreshAfterDate` 只係請求刷新，不係保證更新頻率。

## 5. 驗收門檻（唔再用 CI 綠色代表畫面靚）

**程式回歸：** Mock Scriptable 七日時間分桶、純單日 4筆 HK$200.30、兩類別支出、14 日多活躍日、正負退款、空資料、窄屏 320pt、393pt 標準、iPad Extra Large、特殊付款名稱及本機 JSON 不變。

**版面驗收：** Small 141pt、Medium 141pt、Large 311pt 最窄尺寸; 393pt 標準 158/158/354pt。所有可讀文字由原生 Text 顯示，標稱字級 11pt 或以上。模擬高度只係一道限制，唔能當作原生 UIKit/WidgetKit 圖像驗證。

**實機驗收：** 在 Scriptable App 使用「👀 預覽 Widget 尺寸」，檢查四尺寸及一日／多日資料、文字有冇擠壓、卡片有冇大量空白。**本環境無法直接執行 iOS Scriptable 預覽；實機視覺驗收尚未完成，須明確標示為未驗證。**

## 6. 與前版的變化分類

- **Retained 保留：** 食飯、Payme／自訂 Payment Type、Remark、原始帳本、七日資料、負數退款、FX、Tap Card 自動化、手動輸入及 Numbers 六欄。
- **Updated 更新：** 重寫 Small／Medium／Large／iPad XL 各自版面；一個資料模型供四尺寸用。
- **Corrected 修正：** 從「一支巨大紫柱」改成七日熱度條；單日稀疏資料 Medium 改用分類比重；Large 改全寬列表，而唔再塞半欄。
- **New 新增：** 七日熱度條圖形、單日稀疏切換、完整新 renderer 及針對使用者實機 HK$200.30 場景的回歸測試。
