# Expense Tracker v3.17.0 — Four-Family Widget Visual Design Review

**日期：2026-11-05 | 狀態：重新設計及自動化回歸；實機像素級驗證待完成**

## 1. 使用者截圖：已確認問題

實機 Small 畫面有「本月開支 4筆／HK$200.30／今日 HK$200.30／近7日 HK$200.30／7 日圖」。同一數值連續顯示三次，低訊息增益；圖表的單一較高柱狀物與大字星期標籤搶注意力。問題屬**資訊架構、視覺節奏與圖形編碼**，並非交易資料錯誤。

## 2. 官方研究重新核對

- [Apple HIG Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)：在不同 family 平衡資訊密度、視線可讀性；一般建議 Widget 字體不少於 11pt；避免只延伸細尺寸。
- [Apple Widget 尺寸及邊距規格](https://developer.apple.com/design/human-interface-guidelines/widgets)：Small iPhone 由約 141pt 至 170pt，Medium 高度由 141pt 起，Large 由約 311pt 起；字體／邊距應以最緊迫尺寸壓力測試。
- [Scriptable ListWidget](https://docs.scriptable.app/listwidget/)：原生 Text/Stack/Canvas、refreshAfterDate 為最早偏好時間，不保證 30 分鐘實時更新；背景與 Widget 連結都受系統限制。
- [Scriptable WidgetStack](https://docs.scriptable.app/widgetstack/)：有 padding、size、cornerRadius、borderColor 等原生版面元件。
- [Nielsen Norman Group — Choosing Chart Types](https://www.nngroup.com/articles/choosing-chart-types/)：支出跨日比較用柱狀圖比大面積圓餅更直接，零交易日需要清楚標示但絕不可偽裝成支出。
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)：避免單靠顏色傳達訊息；要保持文字和圖表對比及可讀性。

此處所列是核實過嘅**決策核心來源**，並非 100 份實驗。原有 [100 個來源參考清單](EXPENSE_WIDGET_RESEARCH_100_V3_16.md) 保留作廣泛 bibliography；「100 條可追溯 URL」並不等於「100 項獨立且逐條實際驗證過嘅用戶研究」。

## 3. 四種尺寸的全新資訊架構

| 尺寸 | 主視覺 | 趨勢 | 新資訊 | 防過度擠迫 |
|---|---|---|---|---|
| Small | 一行月份／筆數＋22pt 本月總額 | 7 日各一柱及 7 個原生星期字 | 今日佔本月關係、近 7 日有效記錄日數 | 同額只顯示一次，避免三重 HK$200.30 |
| Medium | 左邊本月／今日／近 7 日 KPI | 右邊 14 日小圖 | 最多消費類別／付款方式 | 左右雙欄，矮手機自動縮短圖 |
| Large | 主金額卡＋今日／近 7 日 | 14 日淨支出圖 | 類別 Top 3、付款 Top 2、最近兩筆 | 雙欄分析卡，比單欄堆疊節省高度 |
| Extra Large（Scriptable iPad） | 主金額 KPI 條 | 30 日＋6 個月雙圖 | 類別 Top 5、付款 Top 3、最近六筆（三欄）、待核對提醒 | 三欄最近交易減少縱向高度 |

**注意平台版本變化：** 2026 年 iOS 27 另有新一代 iPhone Extra Large Widget 報導；但 Scriptable 公開文件仍將 `extraLarge` 描述為 iPad 專用。此專案以 Scriptable 實際暴露 `config.widgetFamily` 的能力為準，不預先承諾 iPhone 安裝 Extra Large。

## 4. 正確性與非功能性要求

- HKD 淨支出使用已驗證 `amountHKD`，未換算／日期無效項目不混算；退款使用負數。
- Small：七個資料 bucket、星期標籤、當日強調，零值只顯示細基線標記，避免一堆無意義高柱。
- 若本月、今日及近七日 HK$ 金額一樣，使用關係性文字替代冗餘金額；但資料計算仍分開，不會虛構趨勢。
- 全尺寸保持一致底色、類別指示色、原生文字（Small ≥11pt）、按鈕／Deep Link 功能。
- 不更改 `transactions.json`、Tap Card 自動化、快速記帳 Token、Numbers 六欄匯出或退款條件。

## 5. 測試界線

GitHub Node Scriptable mocks 可驗證版面樹、字級、圖表資料量、合成 200.30 單日場景、短螢幕高度估計及資源路徑，無法驗證 Apple 真機相對字距、分行或背景 tint。手機／iPad 正式驗收必須使用 Scriptable 逐尺寸 Preview 截圖，先可聲稱「實機冇裁切」。

## 6. 舊版本對照

**保留：** 7 日支出、12 個 Merchant Type（食飯）、Payme／開放式 Payment Type、Remark、FX 控制和本機帳本。

**更新：** 四尺寸統一設計語言、Medium 左右布局、Large 雙欄分析、XL 三欄最近交易。

**修正：** Small 同額三重顯示、空白七日柱形的視覺訊號、舊版跨尺寸視覺層級不一致、狹窄裝置垂直空間過載風險。

**新增：** 截圖對應的 HK$200.30 四筆案例與手機最短尺寸高度預算測試。
