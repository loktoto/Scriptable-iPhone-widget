# Expense Tracker HK — v3.18.0 實機截圖主導的 Widget 重新研究與驗收

**研究／審核日期：2026-11-05**  
**主要證據：** 使用者提交的 1 頁 PDF，內有 Small、Large、Medium 共三張實際 Scriptable Widget 螢幕截圖。  
**目的：** 解決「畫面明顯唔靚但舊版 CI 顯示全部通過」的驗收失效；保留資料正確性，令四種 Family 各自有清晰而高密度的呈現。

## 0. 研究方法與資料可信度（先講清楚）

- **A 級：** 官方文件實際閱讀／網上開啟，包括 [Apple Widget HIG](https://developer.apple.com/design/human-interface-guidelines/widgets)、[Apple HIG Layout](https://developer.apple.com/design/human-interface-guidelines/layout)、[Scriptable ListWidget](https://docs.scriptable.app/listwidget/)、[Scriptable WidgetStack](https://docs.scriptable.app/widgetstack/)、[USWDS Data Visualizations](https://designsystem.digital.gov/components/data-visualizations/)、[USWDS Card](https://designsystem.digital.gov/components/card/)、[USWDS Typography](https://designsystem.digital.gov/components/typography/)、[USWDS Summary Box](https://designsystem.digital.gov/components/summary-box/)、[GOV.UK Summary List](https://design-system.service.gov.uk/components/summary-list/)、[GOV.UK Panel](https://design-system.service.gov.uk/components/panel/)、[GOV.UK Tabs](https://design-system.service.gov.uk/components/tabs/)、[Carbon Chart Axes](https://v10.carbondesignsystem.com/data-visualization/axes-and-labels/) 及 [CFPB Data Visualizations](https://cfpb.github.io/design-system/guidelines/data-visualization-guidelines)。
- **B 級：** 本次新增 **104 條不重複官方設計系統索引頁 URL**，由已確認的 [USWDS 官方目錄](https://designsystem.digital.gov/components/data-visualizations/)、[GOV.UK 官方組件目錄](https://design-system.service.gov.uk/components/)、USWDS tokens/utilities 導覽收集。部分頁面另有直接開啟驗證，但**並無逐一精讀 104 頁**，亦未將其說成 104 項研究實驗。索引已按實際適用程度標記。下面列出完整可追溯 URL。
- **C 級：** 截圖觀察、Widget 模擬程式測試和設計推斷；不可取代 iPhone／iPad 真實像素比較。研究不會假稱已實機驗收。
- 舊版 v3.16 的 100 URL 索引並不視為原始真理。本輪 104 條**與該清單及先前 Dashboard 100 URL 逐項去重後沒有重複 URL**，屬新增參考，惟「更多 URL」本身唔能夠證明設計改善。

## 1. 第一手截圖檢查（已確認，唔係推斷）

| Family | 截圖證據 | 問題 | 新版測試要求 |
|---|---|---|---|
| Small | 「11月開支／HK$200.30／今日 本月全部／近7日 1日有紀錄」及 7 條柱 | 數字雖不再重複，但 7 日圖沒有具體比較價值時仍佔很大比例；星期字太顯眼 | 精簡星期樣式、保留全部 7 日、清楚註明何日有資料 |
| Medium | 左邊「HK$200.30／今日 HK$200.30／近7日 HK$200.30」，右邊 14 日圖只一支 | 同一金額重複三次，無改善決策；只有 1 活躍日卻用 14 日圖 | 以交易日數、分類及付款摘要取代重複數值，縮短稀疏圖表 |
| Large | 頂部 KPI＋14 日圖、兩個細卡，底部長空白 | **未有效用盡約後段 1/4 至 1/3 版面**；細卡金額／商戶字細，最近交易限兩筆 | 改成全寬最近交易清單、3–4 筆並可讀，分類／付款區分開，動態緊湊圖表 |
| Extra Large | 沒有提交 iPad 真機畫面 | 無法確認 layout、文字或內容正確顯示 | 重做為完整分析 UI；標註待實機驗收 |

### 已核實財務關係
- 截圖的分類金額 **HK$100.00 + HK$56.00 + HK$44.30 = HK$200.30**，與本月額一致（僅此截圖情境）。
- 付款方式 Top 2 **HK$100.00 + HK$85.00 = HK$185.00**；不能當作全部付款方式，應補充 **其他 HK$15.30**（僅在全部值已換算、且剩餘金額可解釋時）。
- 最近交易記錄使用「未提供商戶」係資料原本商戶名稱未填；應在 Widget 改用 Merchant Type／付款工具作 **顯示 fallback**，而唔改寫存檔或虛構商戶。
- 當月＝今日＝七日淨支出三個數值相同時，可能係剛好有退款抵銷，唔代表所有交易都發生於今日。**必須按交易日期／數量核實關係，而非只看金額相等。**

## 2. 不可再重複的錯誤推論

1. 「元件存在＋估計高度合格＝視覺合格」**錯**：Large 可能有大幅空白，文字仍不可讀；需要預覽圖像空間利用率及資料量測試。
2. 「Small 放七條柱＝七日都清晰」**錯**：若每日零值過多，應強調真正活躍日，但唔虛構支出。
3. 「越大越多圖」**錯**：只有單一交易日時，14 日圖唔應佔過多地方。改用按資料密度自適應圖表高度。
4. 「同一金額相等＝今日全部」**錯**：遇上跨日正負款項抵銷時會失真，需日期核對。
5. 「純一行付款文字＋大金額都要塞入半欄」**錯**：長付款方法如 Online Payment、信用卡全名會擠迫；先顯示名稱，金額分層展示。

## 3. 設計原則（來源→可驗收決策）

| 直接來源 | 原則 | 本次實作 |
|---|---|---|
| Apple Widget HIG | 在 glanceability 和 information density 之間平衡；大 widget 不能只拉伸細 widget | Small 保留 7 日但加 context；Medium 看 2 週；Large 展示交易；XL 跨月比較 |
| USWDS Data Visualizations | 圖表傳達中心思想，唔可以只靠圖像 | 每個趨勢都說明範圍和有記錄的日數 |
| Carbon axes | 比較性 bar chart 要由零起 | 正負支出柱以零軸為基準，負數退款分色及文字說明 |
| CFPB visualisation | 先選擇正確的傳達方式 | 單日有記錄時縮短 14 日趨勢面積，將視野留予分類／實際交易 |
| USWDS Card | Card 需要非重複的獨立內容 | Large 不再將最近交易藏在半欄細卡 |
| GOV.UK Summary List | 明確 key-value 配對 | 分類及付款方法拆開標籤／金額，保留實際可讀性 |
| Apple HIG Typography | Widget 字一般≥11pt；避免 rasterized 小字 | 大部分值用 WidgetText，避免縮成極小圖表字 |
| Scriptable Docs | Native Stack 及 text 支援，refreshAfterDate 不是強制定時 | 無外部圖表 JS、不新增網絡 API；沿用30分鐘刷新偏好 |

## 4. 版本結論

- **Retained／保留：** 本月支出、日／七日走勢、食飯正式分類、付款方式自訂、負數退款、FX 待核對、JSON 本地保存、Tap Card／Shortcut、Numbers 六欄匯出。
- **Updated／更新：** 四 Family 重寫資訊區塊；Medium 解決三重相同金額；Large 全寬交易清單及更有意義的空間利用；XL 多維度分析。
- **Corrected／修正：** 排版驗收由單一 estimatedHeight 改為同時驗證「有多少可讀資料、訊息是否重複、功能與金額是否真實」；按交易日期判斷「今日全部」。
- **New／新增：** 一日有記錄／七日多筆／跨日退款抵銷／長付款名稱／商戶未提供的 mock 回歸、額外 104 來源分類參考。

### 可重現的修正函式
- `widgetSummary().monthOnlyToday` 的判斷式為 `txCount>0 && todayCount===txCount`；不再用支出合計碰巧相等來推斷所有交易來自今日。
- `paymentRemainder(summary,2)` 以全月 HKD 淨支出扣除頭兩類付款工具的淨額，餘額只於有第三種付款方式且非零時才顯示。
- `recentTitle(transaction)` 只在商戶欄本身為空／「未提供商戶」時用類別與付款名稱作顯示後備，絕不寫回資料庫。

## 5. 必須保留的資料完整性驗收

- Non-zero amount only，退款保留負數；不存在或為零的 amount 不新增紀錄。
- HKD 統計只包括有效日期且已換算的交易；pending FX 不靜默當 HK$0。
- 「食飯」係 canonical label；歷史「食物」可以在顯示層 canonicalize，但交易原始資料不 bulk rewrite。
- 自訂 paymentType，例如 Payme、Online Payment、SOGO VISA，全保留，不可強制歸入大類。
- 手動新增、Tap Card Shortcut、Remark、編輯／左滑刪除、六欄 Numbers bridge 與原本交易檔路徑維持不變。
- Scriptable Node mocks 只能驗證結構，不可代替真 iOS 27 Scriptable/widgetKit 屏幕截圖。

## 附錄：本輪新增104個設計研究來源索引

本附錄新連結有意與舊 100+100 索引去重；**104 份官方資源並不等於 104 項獨立實證研究**。特別是「Supplementary」多為通用組件規範，僅作日後設計迭代的交叉檢查。索引 URL 一般源於官方目錄，部分因網站重定向或改版可能變更；如涉及技術實作，應再打開最新頁面核對。

| # | 機構 | 資料頁 | Widget 關聯度 |
|---:|---|---|---|
| 1 | USWDS Components | [accordion](https://designsystem.digital.gov/components/accordion/) | Supplementary |
| 2 | USWDS Components | [alert](https://designsystem.digital.gov/components/alert/) | Supplementary |
| 3 | USWDS Components | [banner](https://designsystem.digital.gov/components/banner/) | Supplementary |
| 4 | USWDS Components | [breadcrumb](https://designsystem.digital.gov/components/breadcrumb/) | Supplementary |
| 5 | USWDS Components | [button](https://designsystem.digital.gov/components/button/) | Supplementary |
| 6 | USWDS Components | [button-group](https://designsystem.digital.gov/components/button-group/) | Supplementary |
| 7 | USWDS Components | [card](https://designsystem.digital.gov/components/card/) | High |
| 8 | USWDS Components | [character-count](https://designsystem.digital.gov/components/character-count/) | Supplementary |
| 9 | USWDS Components | [checkbox](https://designsystem.digital.gov/components/checkbox/) | Supplementary |
| 10 | USWDS Components | [collection](https://designsystem.digital.gov/components/collection/) | High |
| 11 | USWDS Components | [combo-box](https://designsystem.digital.gov/components/combo-box/) | Supplementary |
| 12 | USWDS Components | [data-visualizations](https://designsystem.digital.gov/components/data-visualizations/) | High |
| 13 | USWDS Components | [date-picker](https://designsystem.digital.gov/components/date-picker/) | Supplementary |
| 14 | USWDS Components | [date-range-picker](https://designsystem.digital.gov/components/date-range-picker/) | Supplementary |
| 15 | USWDS Components | [file-input](https://designsystem.digital.gov/components/file-input/) | Supplementary |
| 16 | USWDS Components | [footer](https://designsystem.digital.gov/components/footer/) | Supplementary |
| 17 | USWDS Components | [form](https://designsystem.digital.gov/components/form/) | Supplementary |
| 18 | USWDS Components | [grid](https://designsystem.digital.gov/components/grid/) | High |
| 19 | USWDS Components | [header](https://designsystem.digital.gov/components/header/) | Supplementary |
| 20 | USWDS Components | [icon](https://designsystem.digital.gov/components/icon/) | High |
| 21 | USWDS Components | [icon-list](https://designsystem.digital.gov/components/icon-list/) | Supplementary |
| 22 | USWDS Components | [identifier](https://designsystem.digital.gov/components/identifier/) | Supplementary |
| 23 | USWDS Components | [in-page-navigation](https://designsystem.digital.gov/components/in-page-navigation/) | Supplementary |
| 24 | USWDS Components | [input-mask](https://designsystem.digital.gov/components/input-mask/) | Supplementary |
| 25 | USWDS Components | [input-prefix-suffix](https://designsystem.digital.gov/components/input-prefix-suffix/) | Supplementary |
| 26 | USWDS Components | [language-selector](https://designsystem.digital.gov/components/language-selector/) | Supplementary |
| 27 | USWDS Components | [link](https://designsystem.digital.gov/components/link/) | Supplementary |
| 28 | USWDS Components | [list](https://designsystem.digital.gov/components/list/) | High |
| 29 | USWDS Components | [memorable-date](https://designsystem.digital.gov/components/memorable-date/) | Supplementary |
| 30 | USWDS Components | [modal](https://designsystem.digital.gov/components/modal/) | Supplementary |
| 31 | USWDS Components | [pagination](https://designsystem.digital.gov/components/pagination/) | Supplementary |
| 32 | USWDS Components | [process-list](https://designsystem.digital.gov/components/process-list/) | Supplementary |
| 33 | USWDS Components | [prose](https://designsystem.digital.gov/components/prose/) | Supplementary |
| 34 | USWDS Components | [radio-buttons](https://designsystem.digital.gov/components/radio-buttons/) | Supplementary |
| 35 | USWDS Components | [range-slider](https://designsystem.digital.gov/components/range-slider/) | Supplementary |
| 36 | USWDS Components | [search](https://designsystem.digital.gov/components/search/) | Supplementary |
| 37 | USWDS Components | [select](https://designsystem.digital.gov/components/select/) | Supplementary |
| 38 | USWDS Components | [side-navigation](https://designsystem.digital.gov/components/side-navigation/) | Supplementary |
| 39 | USWDS Components | [site-alert](https://designsystem.digital.gov/components/site-alert/) | Supplementary |
| 40 | USWDS Components | [step-indicator](https://designsystem.digital.gov/components/step-indicator/) | Supplementary |
| 41 | USWDS Components | [summary-box](https://designsystem.digital.gov/components/summary-box/) | High |
| 42 | USWDS Components | [table](https://designsystem.digital.gov/components/table/) | High |
| 43 | USWDS Components | [tag](https://designsystem.digital.gov/components/tag/) | High |
| 44 | USWDS Components | [text-input](https://designsystem.digital.gov/components/text-input/) | Supplementary |
| 45 | USWDS Components | [time-picker](https://designsystem.digital.gov/components/time-picker/) | Supplementary |
| 46 | USWDS Components | [tooltip](https://designsystem.digital.gov/components/tooltip/) | Supplementary |
| 47 | USWDS Components | [typography](https://designsystem.digital.gov/components/typography/) | High |
| 48 | USWDS Components | [validation](https://designsystem.digital.gov/components/validation/) | Supplementary |
| 49 | GOV.UK Design System | [accordion](https://design-system.service.gov.uk/components/accordion/) | Supplementary |
| 50 | GOV.UK Design System | [back-link](https://design-system.service.gov.uk/components/back-link/) | Supplementary |
| 51 | GOV.UK Design System | [breadcrumbs](https://design-system.service.gov.uk/components/breadcrumbs/) | Supplementary |
| 52 | GOV.UK Design System | [button](https://design-system.service.gov.uk/components/button/) | Supplementary |
| 53 | GOV.UK Design System | [character-count](https://design-system.service.gov.uk/components/character-count/) | Supplementary |
| 54 | GOV.UK Design System | [checkboxes](https://design-system.service.gov.uk/components/checkboxes/) | Supplementary |
| 55 | GOV.UK Design System | [cookie-banner](https://design-system.service.gov.uk/components/cookie-banner/) | Supplementary |
| 56 | GOV.UK Design System | [date-input](https://design-system.service.gov.uk/components/date-input/) | Supplementary |
| 57 | GOV.UK Design System | [details](https://design-system.service.gov.uk/components/details/) | Supplementary |
| 58 | GOV.UK Design System | [error-message](https://design-system.service.gov.uk/components/error-message/) | Supplementary |
| 59 | GOV.UK Design System | [error-summary](https://design-system.service.gov.uk/components/error-summary/) | Supplementary |
| 60 | GOV.UK Design System | [exit-this-page](https://design-system.service.gov.uk/components/exit-this-page/) | Supplementary |
| 61 | GOV.UK Design System | [feedback](https://design-system.service.gov.uk/components/feedback/) | Supplementary |
| 62 | GOV.UK Design System | [fieldset](https://design-system.service.gov.uk/components/fieldset/) | Supplementary |
| 63 | GOV.UK Design System | [file-upload](https://design-system.service.gov.uk/components/file-upload/) | Supplementary |
| 64 | GOV.UK Design System | [generic-header](https://design-system.service.gov.uk/components/generic-header/) | Supplementary |
| 65 | GOV.UK Design System | [govuk-footer](https://design-system.service.gov.uk/components/govuk-footer/) | Supplementary |
| 66 | GOV.UK Design System | [govuk-header](https://design-system.service.gov.uk/components/govuk-header/) | Supplementary |
| 67 | GOV.UK Design System | [inset-text](https://design-system.service.gov.uk/components/inset-text/) | Supplementary |
| 68 | GOV.UK Design System | [language-navigation](https://design-system.service.gov.uk/components/language-navigation/) | Supplementary |
| 69 | GOV.UK Design System | [notification-banner](https://design-system.service.gov.uk/components/notification-banner/) | Supplementary |
| 70 | GOV.UK Design System | [pagination](https://design-system.service.gov.uk/components/pagination/) | Supplementary |
| 71 | GOV.UK Design System | [panel](https://design-system.service.gov.uk/components/panel/) | High |
| 72 | GOV.UK Design System | [password-input](https://design-system.service.gov.uk/components/password-input/) | Supplementary |
| 73 | GOV.UK Design System | [phase-banner](https://design-system.service.gov.uk/components/phase-banner/) | Supplementary |
| 74 | GOV.UK Design System | [radios](https://design-system.service.gov.uk/components/radios/) | Supplementary |
| 75 | GOV.UK Design System | [select](https://design-system.service.gov.uk/components/select/) | Supplementary |
| 76 | GOV.UK Design System | [service-navigation](https://design-system.service.gov.uk/components/service-navigation/) | Supplementary |
| 77 | GOV.UK Design System | [skip-link](https://design-system.service.gov.uk/components/skip-link/) | Supplementary |
| 78 | GOV.UK Design System | [summary-list](https://design-system.service.gov.uk/components/summary-list/) | High |
| 79 | GOV.UK Design System | [table](https://design-system.service.gov.uk/components/table/) | High |
| 80 | GOV.UK Design System | [tabs](https://design-system.service.gov.uk/components/tabs/) | High |
| 81 | GOV.UK Design System | [tag](https://design-system.service.gov.uk/components/tag/) | Supplementary |
| 82 | GOV.UK Design System | [task-list](https://design-system.service.gov.uk/components/task-list/) | Supplementary |
| 83 | GOV.UK Design System | [text-input](https://design-system.service.gov.uk/components/text-input/) | Supplementary |
| 84 | GOV.UK Design System | [textarea](https://design-system.service.gov.uk/components/textarea/) | Supplementary |
| 85 | GOV.UK Design System | [warning-text](https://design-system.service.gov.uk/components/warning-text/) | Supplementary |
| 86 | USWDS Design Tokens | [color](https://designsystem.digital.gov/design-tokens/color/) | High |
| 87 | USWDS Design Tokens | [typesetting](https://designsystem.digital.gov/design-tokens/typesetting/) | Supplementary |
| 88 | USWDS Design Tokens | [flex](https://designsystem.digital.gov/design-tokens/flex/) | Supplementary |
| 89 | USWDS Design Tokens | [opacity](https://designsystem.digital.gov/design-tokens/opacity/) | Supplementary |
| 90 | USWDS Design Tokens | [order](https://designsystem.digital.gov/design-tokens/order/) | Supplementary |
| 91 | USWDS Design Tokens | [shadow](https://designsystem.digital.gov/design-tokens/shadow/) | Supplementary |
| 92 | USWDS Design Tokens | [spacing-units](https://designsystem.digital.gov/design-tokens/spacing-units/) | High |
| 93 | USWDS Design Tokens | [z-index](https://designsystem.digital.gov/design-tokens/z-index/) | Supplementary |
| 94 | USWDS Utilities | [color](https://designsystem.digital.gov/utilities/color/) | Supplementary |
| 95 | USWDS Utilities | [height-and-width](https://designsystem.digital.gov/utilities/height-and-width/) | Supplementary |
| 96 | USWDS Utilities | [margin-and-padding](https://designsystem.digital.gov/utilities/margin-and-padding/) | High |
| 97 | USWDS Utilities | [border](https://designsystem.digital.gov/utilities/border/) | Supplementary |
| 98 | USWDS Utilities | [outline](https://designsystem.digital.gov/utilities/outline/) | Supplementary |
| 99 | USWDS Utilities | [font-size-and-family](https://designsystem.digital.gov/utilities/font-size-and-family/) | High |
| 100 | USWDS Utilities | [text-styles](https://designsystem.digital.gov/utilities/text-styles/) | Supplementary |
| 101 | USWDS Utilities | [paragraph-styles](https://designsystem.digital.gov/utilities/paragraph-styles/) | Supplementary |
| 102 | USWDS Utilities | [display](https://designsystem.digital.gov/utilities/display/) | Supplementary |
| 103 | USWDS Utilities | [flex](https://designsystem.digital.gov/utilities/flex/) | Supplementary |
| 104 | USWDS Utilities | [shadow](https://designsystem.digital.gov/utilities/shadow/) | Supplementary |

**來源數量：** USWDS 組件 48、GOV.UK 組件 37、USWDS Tokens 8、Utilities 11，**合計 104**，同一 URL 無重複。
