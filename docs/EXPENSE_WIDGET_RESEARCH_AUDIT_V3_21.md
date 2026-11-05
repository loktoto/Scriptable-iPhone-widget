# Expense Tracker Widget — v3.21.0 重建研究與實機截圖審計

**研究日期：2026-11-05　|　研究對象：v3.20.0 → v3.21.0　|　語言：繁體中文（香港）**

## 摘要與研究範圍

本次研究**不以此前研究報告為真理**。以使用者最新上傳一頁 PDF（Small／Medium／Large 真機畫面）、GitHub `widgets/expense-tracker/HK-Expense-Tracker.js` v3.20.0、GitHub Actions 真實回歸記錄，及重新查閱的 Apple、Scriptable、USWDS、W3C、IBM、Datawrapper 官方文件為基礎。未獲使用者提供原始 transactions.json，**不能**宣稱對帳本逐筆進行驗證，亦未曾在 iOS 原生 Scriptable 取得新版本真機截圖。

**總結：v3.20.0 確實有 Small 1圖、Medium 2圖、Large 3圖、iPad XL 4圖，但「圖表數量」不能取代資訊品質。** 三張實機圖顯示 Small 7日柱缺日期、Medium 14日圖只一支柱、Large 近半畫面唔夠有效利用及右欄付款名稱過長。最大根因係使用固定圖形，忽略只有1–2個活躍日嘅稀疏資料；另有原始檔「分類／付款比例=退款前正向消費」嘅語義，但 Large 畫面只寫「支出分類／付款構成」，未說明分母。

## A. 原始截圖可觀察事實（高信心；非模型模擬）

| 尺寸 | 原圖實見內容 | 確認問題 | 設計修正 |
|---|---|---|---|
| Small | `11月 · 支出 4筆`、`HK$200.30`、`最近7日 1日有紀錄`、右端一支紫柱、`訂閱50%` | 只有一個活躍日；7個日期沒有原生字標，無法從圖判別確切星期 | <=2活躍日改等高活動標記；7個原生星期字；>2日保留真實金額柱 |
| Medium | 14日淨額圖右端一支柱、全寬分類堆疊條、`分類 訂閱50%`、右端 `Online Pay` 被截短 | 時間圖大量空白、分類條無完整對應標籤，並將無價值的付款文字迫到最右 | <=2活躍日以14格記帳日分佈代替金額尖峰；顯示 Top2 分類名及佔比 |
| Large | 總額／14日單柱圖／50-28-22 Donut／付款100、85、15.30／最近2筆 | 時間圖信息價值偏低；右側長付款名稱截短；付款條細；最近交易僅2筆；底部仍有空間 | 稀疏日改活動時間線；付款比例條加厚、顯示退款前分母；最近3筆，保留 Donut |
| iPad XL | 未有實機截圖 | 沒有任何真機證據證明最細／最大 iPad 畫面字體不重疊 | 新增密度自適應30日與6月圖；保持現有高度門檻；待實機確認 |

截圖付款工具金額 `HK$100.00 + HK$85.00 + HK$15.30 = HK$200.30`，可對上顯示月額。分類 `50% + 28% + 22% = 100%`。**百分比係四捨五入的畫面展示值，未有交易原檔，不能反推出確實類別金額。**

## B. 網上研究：第一手來源與可落地規範

1. **Apple Widgets HIG** — https://developer.apple.com/design/human-interface-guidelines/widgets ：不同 Family 有不同主要任務；Small 一眼可理解，Large 應加上真正詳細的圖形；避免塞字、多余標籤，原生文字一般至少 11pt；小尺寸不能只靠顏色表意。
2. **Apple Layout HIG** — https://developer.apple.com/design/human-interface-guidelines/layout ：閱讀順序、對齊、分組與視覺層級，比放多幾個區塊重要。
3. **Apple WidgetKit Widget Sizing** — 以上 Widgets HIG 規格表：393pt iPhone 對應 Small 158×158、Medium 338×158、Large 338×354；320pt 對應 141×141、292×141、292×311；iPad Extra Large 依型號另有305.5pt等高度。
4. **Scriptable ListWidget** — https://docs.scriptable.app/listwidget/ ：四尺寸預覽；`refreshAfterDate` 是建議刷新日期，不是30分鐘強制保證；Widget 受記憶體限制。
5. **Scriptable DrawContext** — https://docs.scriptable.app/drawcontext/ ：可用原生 `DrawContext` 畫矩形、橢圓、填充路徑；畫圖文字應盡量使用 `WidgetText`。
6. **Scriptable Path** — https://docs.scriptable.app/path/ ：`move`、`addLine`、`closeSubpath` 支援以扇形 Path 畫 Donut 圓環。
7. **Scriptable WidgetStack** — https://docs.scriptable.app/widgetstack/ ：Stack 可設尺寸、對齊及內距；太長文字在窄欄要有清楚降級策略。
8. **USWDS Data visualizations** — https://designsystem.digital.gov/components/data-visualizations/ ：每個圖只講1個主要意思；零值、日期軸、數值表達及可讀替代文字不可缺；機械檢查不能驗證圖表意圖。
9. **IBM Charts design guidance** — https://www.ibm.com/design/language/data-visualization/charts/ ：時間趨勢適合柱線圖、比例適合 Donut／Stacked、精確比較優先長條。圖表要按問題選，唔係按數量選。
10. **Datawrapper Pie Chart guidance** — https://www.datawrapper.de/blog/pie-charts ：少量分類 Donut 可以顯示整體比例；類別多或細比例比較時，應採用橫向條形或合併「其他」；圖例須完整。
11. **W3C WCAG 2.2** — https://www.w3.org/TR/WCAG22/ ：不可單靠顏色；一般正文對比 4.5:1、大字 3:1 係 AA 目標；Widget 不可因目前 11pt 標稱字級就宣稱 WCAG 完全符合。
12. **Dime App Store** — https://apps.apple.com/us/app/dime-budget-expense-tracker/id1635280255 ：官方確認有 Home/Lock Screen Widgets、分期消費分析；影像示例僅為同類產品參考，不能用來證明此產品有同一套 Scriptable 功能。
13. **MoneyCoach Widgets 官方展示** — https://moneycoach.ai/moneycoach-10-on-ios-18 ：目標／預算／每日限額分成不同 Widget，重點係每張有明確目的，而非同一月額多次印出。
14. **MoneyCoach 2026 changelog** — https://moneycoach.ai/blog/moneycoach-app-changelog ：今年度持續修正多幣、分類統計、Widget 資料同步，說明數據語義／可靠性不可忽略。

以上為可追溯第一手規範、產品官方資料，以及一頁真機截圖；**不是**14項獨立用戶體驗實驗，也不把舊100/104 URL 索引當作已深度核實的研究。

## C. 數據及程式核實

**v3.20.0 已證實的實作：**
- `widgetSummary()` 由 `db.transactions` 計算 HKD 金額；資料無效日期或缺已換算的 `amountHKD` 被標為 `unresolved`。
- 每日柱圖使用 signed net；分類 Donut 及付款 Stacked 使用正向消費的 `grossCats/grossPayments`，避免負數扇形。
- `makeDonutChart()` 用 Scriptable `Path` 扇形再切洞；Large 已有三種不同圖形，不能誤稱「冇任何圖表」。
- `tests/expense-widget-sizes.test.js` 透過 Node Scriptable mock 檢查資料與估算高度；**不能**還原 iPhone 真正文字排版或顏色／裁切問題。

**必須修正的語義：**
- `gross=正向消費`；`refundValue=退款絕對額`；`month=淨支出=gross−refundValue`。
- Donut／付款比例圖一定標示「退款前」，否則退款月份讀者可能以為環形圖百分比係淨額構成。
- 稀疏時間線「14日有幾日記帳」與「每日花幾多」係兩個不同問題，不可用相同柱型及相同標題混淆。
- 空值、負數退款、只有一個類別、取消交易後淨額零、外幣待轉換都要獨立測試。
- 日期／月份必須清楚；Small 7日新增星期字，Medium／Large 的稀疏圖明確標示多少活躍日。

## D. 實作改進與驗收矩陣（v3.21）

| 類別 | 保留／修正 | 驗收 |
|---|---|---|
| Retained 保留 | 本機JSON、Tap Card、Shortcuts、手動記帳、Remark、Payme及自訂付款、食飯分類、FX、退款、Numbers bridge | 維持原入帳、退款、匯出同版本檢查 |
| Updated 更新 | Small 加7個 native weekday；Medium 同行展示前兩類別；Large 付款條較厚及顯示最近3筆（窄屏2筆）；XL圖形感應資料量 | 測試資料稀疏與多日資料 |
| Corrected 修正 | <=2個有紀錄日改等高標記，避免巨型單柱；Large 圖例標「退款前」；Donut 最多4個 legend 項避免無圖例扇形 | 活動標記確保每個格8pt；金額不亂改 |
| New 新增 | `makeActivityTimeline`、`addContextChart`、`addWeekdayAxis`；原生7星期字及完整稀疏圖行為測試 | GitHub Actions 程式測試＋新版本記錄 |

## E. 驗收方法與限制

- **第一級（已可自動驗證）：** JavaScript語法、所有圖形呼叫、圖表數、退款勾稽、活動日期數、週標籤、Small/Medium/Large/XL估算尺寸、本地JSON不變。
- **第二級（不能從自動測試推斷）：** 真機字體比例、長商戶和付款名稱、暗色/透明背景、不同 Dynamic Type/色盲情境、iPhone Home Screen 實際 WidgetKit 可用空間及 iPad XL 視覺。
- **第三級（未有資料）：** 使用者真實交易資料庫、全部歷史外幣匯率正確性、UI使用者任務完成時間、產品與同類 App 的A/B測試；不得稱作已驗證。

**決策：** 重設不能再只追求「1/2/3/4張圖」；要按可觀測資料的稀疏程度切換圖形目的，再透過真機截圖確認。此文件係設計與原始碼審計，不冒充可直接從 GitHub CI 得到實機視覺合格證明。
