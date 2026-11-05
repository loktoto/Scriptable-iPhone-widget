# Expense Tracker HK｜Large Widget 重建研究及實作審計 v3.23.0

**研究日期：2026-11-06｜範圍：Large Widget；維持 Small／Medium／iPad Extra Large**

## 1. Executive finding

用戶上傳之 PDF（一頁，含 Large/Medium/Small 實機截圖）顯示：在 2026-11-06 早段，**今日 0 筆、今日 HK$0.00、本月 5 筆、月額 HK$550.30**。Large 上方月度柱圖大部分面積空白、分類 Pie 下方另列圖例令右方空間無法利用、付款方式一條薄色帶配多行易截斷的文字，以及「最近交易」三行像普通清單。截圖分類約 **食飯74%、訂閱18%、飲品8%**；付款方式可見 **350、100、85 HKD**，總額 HK$535，並非 HK$550.30。注意截圖「HK$85.00」付款方式文字與最近交易「HK$29.00」並非同一種統計口徑，**不能**從截圖推定付款分類是否全部列出，更不能用其 535 元代替月底月額。此差額說明當時畫面只列前三付款工具，不表示帳本不一致。

### 問題根因

1. 固定單一柱圖無法在月初（只一日記帳）產生有意義的時間比較，但不可憑空生成消費柱。
2. Pie 圖與圖例上下分離，多出未利用的橫向空間；真正需要係圖形與說明視為同一視覺組。
3. Payment 一條橫向堆疊帶只能說明相對構成，難以直接比較三個付款來源金額差距。
4. Large 上半部「今日／本月」數字有價值，但之後嘅整個排版未有「時間／分類／渠道／短期變化」嘅資訊架構。
5. 畫面除圖形數外，應特別注意 **Label、負數退款、0值、字長、設備高度** 和視覺層級。

## 2. 獨立官方來源及研究範圍

本次核實的主要來源（使用原始文件，而非沿用舊版報告）：

- [Apple Widgets Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/widgets) — 不同尺寸需要不同資訊層次，Large 不應只是放大 Small；當圖形可清楚傳達資料時可代替長文字；一般避免低於11pt。
- [Apple Layout Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/layout) — 重點放頂部、同類資料以一致對齊和間距分組；長文和不同字體尺寸需要有自適應規則。
- [Scriptable ListWidget](https://docs.scriptable.app/listwidget/) — `spacing`、`addSpacer()`、`refreshAfterDate` 等原生能力；刷新唔保證指定時間。
- [Scriptable DrawContext](https://docs.scriptable.app/drawcontext/) — 繪製 bar、pie、mini horizontal bars 使用原生 Context / Path，不用 web 圖表服務。
- [Carbon Design System — Simple Charts](https://www.carbondesignsystem.com/building-blocks/data-visualization/simple-charts) — 時間序列用柱圖；單一類別組成用 Pie/Stacked；類別大小比較用具相同零基線的橫向 Bar。
- [Apple WidgetKit](https://developer.apple.com/documentation/widgetkit/creating-views-for-widgets-live-activities-and-watch-complications) — 版面需適應裝置／字級尺寸；Scriptable 雖用不同 SDK，但可參考設計原則。

以上是**設計規範和可用 API 依據**，不等於真實 iPhone 視覺驗收或定量 UX 測試；不將既有的數百網頁索引當作經核實的一手實驗。

## 3. 已保留 Retained

- **數據來源不變**：只讀本機 `ExpenseTrackerHK/transactions.json` 交易資料。
- **正向分類及付款**：Pie、付款條仍用 `grossCats`、`grossPayments`（只計正向消費，退款獨立處理）；總額及時間圖仍用 signed net HKD。
- **HKD 保護**：未有 `amountHKD` 或無效日期，不混入 HKD 圖表。
- **交易入口**：Tap Card、Shortcuts、手動輸入、Remark、PaymentType、編輯及左滑刪除、Numbers 6欄完全不改。
- **其他尺寸**：Small、Medium、iPad XL 介面保持現有版面。

## 4. 已更新 Updated

| Large 區域 | v3.22.1 | v3.23.0 |
|---|---|---|
| Header／KPI | 分散在幾段 | 更統一且緊湊的一條標題及今日／本月雙 KPI |
| 月度圖 | 34–40pt 高度 | 37pt（窄）／51pt（一般），保留月份1日至今天兩端標籤 |
| 分類 | Pie 在上，Legend 在下 | Pie 與最多三個分類比例 Legend 在同一橫行 |
| 付款 | 15pt 構成帶 + 三行金額字 | 最多三條獨立橫向迷你圖，每項有付款名稱及 **真實金額** |
| 比較 | 無 | 新增近7日及前7日總淨額比較（兩條比例條） |
| 最近交易 | 最多三筆 | 一般兩筆，窄屏一筆，留更多空間給比較圖 |

**付款條的長度 = 該付款工具金額／畫面中最高付款工具金額。** 這不是百分比、不是總額占比，因此不可誤讀為100%堆疊圖。比較基準為顯示的最高項目，所有金額仍標 HKD。

## 5. 已修正 Corrected

- 將 Pie 與 legend 並排，避免因單圖留大量空間。
- 將付款方式變成可比較的**共享比例基準橫向條**，以圖形取代被截短的三行純文字。
- 「近7日 vs 前7日」從 `byDay` 讀取 14天已換算淨額，跨月也正確。近7天是今天到6天前；前7天是7–13天前，兩段不重疊。
- 允許退費形成負淨額：比較條以絕對金額反映幅度，負值以 mint 色及負號展示；既沒有將負退款改成正支出，也沒有假設投資回報。
- 進一步將頂部各行同分類／付款資料用一致的 2-column grid 分組，避免畫面看似普通文字流水帳。

## 6. 新增 Newly added

- `previous7` 時間段淨支出數據。
- `makeMeterBar` 原生6pt橫向繪圖，0值顯示空軌，負數用不同顏色。
- `addPaymentMeterRows` 類別排行（名字＋金額＋比較 bar）。
- `addWeekComparison` 兩段相鄰七日的可視比較。
- GitHub Node Scriptable mock tests：Large 畫圖總數 7（一般）或6（320pt），以及前7日計算、退款、外幣、空資料和之前功能。

## 7. 反例檢查與限制

1. **所有消費在同一日**：月度柱圖仍只一支；這是客觀交易分佈，不能製造其他日期柱。新增週期比較、分類 Pie 及付款 bars 讓有限資料也呈現不同分析角度。
2. **前7日零支出**：週比較第二條空，文字顯示 HK$0.00；唔宣稱增長無限或100%。
3. **所有支出被退款抵銷**：月度淨額0，但分類／付款 Pie 仍有正向消費；圖形分母不同，必須在文件而不是強行塞在 Widget 內解釋。
4. **長付款名稱**：Widget 顯示名截短，帳本原值不變；如果名字太似，金額仍做辨識依據。
5. **iPhone 320pt / 393pt**：條件性減少付款排行及最近交易；程式估算高度通過仍不代表 Scriptable 真機 pixel 完美。
6. **截圖只代表 2026-11-06 一個時間點**：無法推斷每個月的分類比例、退款分佈或未提供交易的準確值。

## 8. 驗收標準

- 320pt Small／Medium 不改，Large 要不超過311pt；393pt Large 不超過354pt（GitHub Node 模擬估算）。
- Large 一般要有月度圖、Pie、三條付款排行迷你圖、兩條7日比較圖，共七個 DrawContext image；320pt 為月度圖、Pie、兩付款圖、兩週比較，共六個。
- `previous7` 嚴格等於 7–13 日前 signed `amountHKD` 總和；月度／今日淨額及交易數不變。
- Source 檢查原 script mirror 跟 canonical 完全一致，不留未用的舊圖形函式。
- **真機視覺驗收仍未完成**：要用 Scriptable 真正顯示 Large 截圖觀察字截斷、垂直空白、不同型號圖形大小、對比度。
