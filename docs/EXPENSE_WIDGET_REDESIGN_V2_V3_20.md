# Expense Widget Redesign v2 — v3.20.0

**日期：2026-11-05｜平台：iOS Scriptable + iPadOS Extra Large｜研究類型：官方規範＋真實產品對照＋原始碼 audit**

## 執行摘要
上一版 v3.19.0 已建立 Small/Medium/Large/Extra Large 的不同資訊密度，但 Medium 仍然會因為交易只發生一日而刪掉時間圖；Large 的主要部分係文字排行，明顯未達到「越大越多圖形」的需求。

**本次採用 Charts-first：Small 1 圖、Medium 2 圖、Large 3 圖、iPad Extra Large 4 圖，並保留足夠可讀嘅 Native Text。**

## 1. 核實來源與同類產品

| 來源 | 現時已可驗證的事實 | 對設計的用處 |
|---|---|---|
| [Apple — Widgets HIG](https://developer.apple.com/design/human-interface-guidelines/widgets) | 小尺寸應有單一主訊息；大尺寸可展示更詳細的視覺化；資料密度應同可讀性平衡 | 制定每個 Family 嘅主題與圖表數 |
| [Apple — Charts HIG](https://developer.apple.com/design/human-interface-guidelines/charts) | 優先顯示資料本身，簡短標籤與清楚上下文；聲明圖表代表甚麼 | 「淨支出」、「正向支出」必須分清，零軸及退款顏色要合理 |
| [Scriptable — ListWidget](https://docs.scriptable.app/listwidget/) | Widget 可加入 native text、stack、DrawContext 圖；刷新由作業系統控制，記憶體有限 | 單檔 JavaScript，無網上圖表函式庫及無外部素材 |
| [Scriptable — DrawContext](https://docs.scriptable.app/drawcontext/) | 支援填色、橢圓、路徑填色與產生影像 | 以 Path 多邊形繪製 Donut，而非 WebView/SVG |
| [Scriptable — Path](https://docs.scriptable.app/path/) | Path 有 move、addLine、closeSubpath | 原生環形分類分佈圖 |
| [MoneyCoach 官方 Widget](https://moneycoach.ai/moneycoach-10-on-ios-18) | 目標、預算和分類等不同 Widget 用不同資訊視覺呈現 | 主 KPI、比例進度及簡短分類摘要 |
| [MoneyCoach 官方功能](https://moneycoach.ai/features) | 預算/分類進度條及跨時段比較 | Medium 升級為趨勢 + 比例條，避免純文字 |
| [Spendee App Store](https://apps.apple.com/us/app/expense-budget-app-spendee/id635861140) | 提供 iPhone Home Screen 支出、預算、現金流 Widget | 財務資料可簡明直接顯示，圖表與快捷記帳共存 |
| [Dime widget 實例](https://indie.watch/issue-14-dime-by-rafael-soh/) | 小尺寸包含短每日柱狀、分類分佈及支出摘要 | Small 微圖要存在，但不以巨大單柱主導畫面 |
| [Spendient 官方示例](https://spendient.com/) | 月度分類進度使用對齊橫向比較條 | 付款方式用堆疊比較，比連續文字更加有效 |

研究依據係官方設計說明及可見產品功能；不將設計圖當成產品真實使用數據或用戶行為實證。先前 100/104 來源索引作為延伸參考，不代表本次逐頁驗證幾百篇獨立研究。

## 2. 四尺寸 Blueprint（v3.20.0）

| Family | 主要訊息 | 新圖表 | 文字上限／佈局 |
|---|---|---|---|
| Small | 本月 HKD 淨額 | 最近7日 signed bars（1圖） | 交易數 + 最大分類／佔比；**不再重複**相同月／今日／七日金額 |
| Medium | 月額及記帳活躍度 | 14 日淨額柱圖 + 分類正向消費比例條（2圖） | 1 行類別，1 行付款摘要，保證小尺寸文字不迫 |
| Large | 月額及直觀消費結構 | 14日 signed bars + 分類 Donut + 付款堆疊比例條（3圖） | 左右兩區圖表，底部最多兩筆最近交易 |
| Extra Large（iPad） | 月額、正向消費、退款金額 | 30日 signed bars + 六個月 signed bars + 分類 Donut + 付款堆疊比例條（4圖） | 三欄六筆最近交易，兼顧比較和明細 |

**繪圖架構：** 所有圖表由 Scriptable `DrawContext` 直接渲染。Donut 以 `Path` 畫扇區，再用背景色切出中心；全部標籤依舊使用原生 `WidgetText`，唔會以縮細 raster 字體去塞滿 Widget。

## 3. 會刪除甚麼／不會顯示甚麼
- 删除 v3.19.0 舊七日熱度圖、純文字分類表格 renderer、冇被調用嘅輔助函式。
- 不再喺 Medium 因單日資料就整張移走 14 日圖：**保持時間軸上下文**，同步加入第二個真正圖表。
- 不使用虛構預算、收入、儲蓄餘額、年化增長、預測或外幣估值。
- 不把 Top 2 付款方式誤當「全部付款」。
- 不把歷史「食物」強制改存「食飯」；只在顯示層使用現有 canonical category 映射。

## 4. Chart accounting rules / 數據精確定義

**月度淨支出 = Gross Positive Spending − Refunds（退款絕對額）**

- 「最近7／14／30日淨支出圖」採 `amountHKD` 正負總和：正支出柱向上，退款日淨額可低於零軸，唔將退款歸類為正支出。
- 「本月分類 Donut」及「付款比例條」使用 **本月正向消費原額**，獨立扣除不了退款，不會產生負百分比。所有分類額加總等於 `gross`；`gross - refundValue = month`。
- Donut 超過四個分類時，只顯示 Top 3 + 「其他」，仍保證圓環百分比總和 100%。
- 匯率待核對／日期無效列不會當作 HKD 參與任何圖形，仍顯示待核對筆數；保留原交易記錄。
- `monthOnlyToday` 由日期／交易數判斷，不由數值剛好相等而誤判。
- 動態 PaymentType 全部保留原名稱，Widget 範圍有限只截短顯示，絕不回寫變更。
- 空資料顯示 0 及「尚無支出」，不畫虛假比例。

## 5. 跨尺寸驗收與風險

| 檢查 | 自動化可確定嗎？ | 必須實機補充嘅核對 |
|---|---|---|
| Small 7日、Medium 14日、Large 3圖、iPad 4圖 | 可以：Mock 檢查圖形數量及 DrawContext 方法 | 手機畫面線條／字體比例 |
| Donut 真扇區、圖例、退款／正額語義 | 可以：Path 調用＋數據斷言 | 色彩辨識、視障裝置輔助閱讀 |
| 320pt/393pt iPhone、iPad 634×305.5pt 最細 XL | 可以：保守版面高度估算 | 真實 Scriptable 漸縮、文字截斷、padding |
| Shortcut／Tap Card／JSON／Numbers bridge | 可以：維持既有回歸 suite | iPhone Shortcut 真實拍卡、手機本機存取 |

**注意：** mock 畫面高度係保守估算，**不能**被解讀為真機驗收。未有真實手機運行 Scriptable 截圖以前不會聲稱 UI 已經「完全完美」。

## 6. Retained／Updated／Corrected／New

- **Retained:** 本機 JSON、食飯、十二分類、自訂 PaymentType、Remark、退款規則、Tap Card、手動記帳、FX 保護、Numbers 六欄及 Quick Widget 入口。
- **Updated:** Small 7日圖，Medium 兩圖，Large 真 Donut＋付款堆疊，iPad Extra Large 四圖。
- **Corrected:** 區分 Gross/Net，避免退款令圓環百分比誤導；帳本不計未換算外幣；Large 不再以成排文字充當分析。
- **New:** 原生 Path Donut、組合比例條、繪圖來源測試、4 family regression 與單日／退款／空紀錄對照驗證。
