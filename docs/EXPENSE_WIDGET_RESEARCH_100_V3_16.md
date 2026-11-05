# Expense Tracker HK — Widget 可讀性與資訊密度研究 v3.16.0

**研究日期**：2026-11-05 · **語言**：繁體中文（香港） · **研究目標**：恢復 Small Widget 近七日支出視覺化，喺有限 WidgetKit 點數空間內保留最多有用資訊，同時唔犧牲文字清晰度。

**研究基礎**：重新檢視 v3.15 程式／回歸測試、Apple WidgetKit/HIG、Scriptable API、W3C WCAG、IBM/NNGroup/Tableau。上一份 v3.15 報告只係比較參考，唔作為事實來源。


## 關鍵研究結論（重要來源交叉核實）

1. **Small Widget 不是「只能顯示一個 KPI」。** Apple HIG 寫明資訊密度需平衡：太疏會削弱使用價值，太密則損害 glanceability；應以更清楚層級、適當圖形取代擠迫細字。Apple 同時提供 iPhone Small 尺寸表：141×141、148×148、155×155、158×158、169×169、170×170pt 等視裝置而定。**直接依據**：[Apple Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)、[WidgetFamily](https://developer.apple.com/documentation/widgetkit/widgetfamily)。
2. **「近七日每日淨支出」屬 7 個重要資訊點，應恢復。** NNGroup 比較長度／位置編碼更容易讀出數量差異，IBM 對比較圖建議避免過多網格與元素；因此選七條柱，而非七個擠迫嘅 HK$ 字串。這是**設計推論**，唔係 Apple 明文要求必須畫七條。[NNGroup Dashboard](https://www.nngroup.com/articles/dashboards-preattentive/)、[IBM Charts](https://www.ibm.com/design/language/data-visualization/charts/)。
3. **文字採用 11pt 作一般下限。** 用原生 `WidgetText` 畫七個星期標籤，唔用 8pt `DrawContext.drawText`；圖形則單獨 `DrawContext`。部份其他大尺寸舊 UI 仍存在 9–10pt 輔助文字，不能因此聲稱全應用完全符合 11pt；本輪只針對 Small 嘅新設計落實。 [Apple Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)、[WidgetText](https://docs.scriptable.app/widgettext/)、[DrawContext](https://docs.scriptable.app/drawcontext/)。
4. **單一支出計算來源。** Widget 同 Dashboard 皆用有效日期及 `amountHKD`；每天以含退款負數嘅淨額計算，外幣 FX pending 暫不加入 HKD。這是現有程式事實及財務顯示正確性約束，並非來源提出嘅新功能。
5. **清晰標題與最小標註。** 將「今日」及「近7日」合計同本月總額放前景，七柱下只用週一至週日嘅單字原生標籤，並以最後一天較亮色標識今日。注意單字「日／一／二…」必須連同「近7日」標題閱讀，避免誤作日期數字。
6. **真實小部件尺度驗收。** 按 Apple 指引，於約 141pt 高嘅最細版面預算：上下 padding 15pt，標題約 13pt，本月總額約 24pt，今日約 14pt，近7日摘要約 14pt，圖 30pt，星期標籤約 13pt，加約 11pt 空隙，總計約 134pt（**設計估算，不是實機量度**）。如果 Scriptable 實際字體 ascent／WidgetKit 縮放不符，仍須以實機預覽校正。
7. **iPad Extra Large 仍獨立。** iPhone 上 Small／Medium／Large 不能模擬 iPad Extra Large；iPad XL 仍保留兩圖及高資訊密度。設計變更只需復原 Small 缺少嘅七日圖，不需要推翻 v3.15 大小分層。
8. **刷新時間不作 SLA。** Scriptable `refreshAfterDate` 只係最早可刷新時間，iOS 負責實際時機；資料不更新時唔得暗示即時。[ListWidget refreshAfterDate](https://docs.scriptable.app/listwidget/)。

## Small Widget v3.15 vs v3.16：客觀變更

| 元素 | v3.15（上版） | v3.16（今版） | 原因 |
|---|---|---|---|
| 本月淨支出 | 大型內層卡片，20–21pt | 更集中嘅 20pt 文字，去除內卡 | 減裝飾／留位置畀日圖 |
| 今日支出 | 一行 | 一行，11pt 原生文字 | 保持即時性及可讀 |
| 近七日走勢 | **刪除咗** | **重新畫出 7 條每日淨支出柱** | 修正上版功能退步 |
| 近七日合計 | 無 | 有，與「近7日」同一行 | 增加可比較資訊 |
| 星期標籤 | 無 | 7 個原生星期文字 | 讓 7 條柱可對應日期 |
| 本月交易數 | 尾段一行 | 精簡喺標題右邊 | 省空間 |
| 待核對 | 同交易數尾段 | 有待核對則標題右邊顯示警告數 | 異常優先顯示 |
| 快速記帳 | 支援 `widgetParameter=quick` | 不變 | 不破壞原有自動化 |

### 反例、限制與必要修正

- **七日每一日都要顯示完整 HK$ 數字？** Small 141pt 高時，七個完整文字欄極易縮成細過 11pt，反而違反用戶「睇得清」嘅條件。因此現版顯示七條柱＋原生星期標籤；完整每日金額應進 Dashboard。
- **只有負數退款一日**：保留負數淨額，繪於基準線下；不把退款偽裝成零。零交易日及正負抵銷日均可出現零高度圖柱，但底層交易仍存在。
- **一日無 HKD 交易但有待換算外幣**：唔將 pending FX 強行計成 HK$0 消費；保留 pending 警告。
- **巨大金額**：`compactMoney()` 顯示 k/m 作簡寫；總數 20pt 仍提供 `minimumScaleFactor=.86` 控制極端值，而不是將普通文字縮到 7pt。
- **小型 320pt 螢幕、StandBy、不同字體輔助設定**：只有 GitHub mock 測試，無 iPhone 真實截圖驗收；不可承諾全裝置絕不裁切。
- **跨日更新**：Widget 顯示資料時依當次執行的本機時間計算；WidgetKit 更新排程會影響何時切換到新一日。

## 100 來源之方法說明（避免以數量冒充證據）

下列是 **100 個獨立原始 URL**，從 Apple、Scriptable 官方 API 索引、W3C WCAG 2.2 官方索引、IBM、Tableau、NNGroup 及 Google Charts 查得，分類成直接實作／可讀性／視覺設計等。

- **Tier 1 — 決策來源**：Apple Widgets/WidgetFamily、Scriptable ListWidget/WidgetStack/WidgetText/DrawContext、NNGroup dashboard、IBM Charts、Tableau dashboard，直接決定 Small 版面。
- **Tier 2 — 支援來源**：文件中的其他 API、資料安全、排版、WCAG 各準則，作其他區域同風險檢查。
- **Tier 3 — 參考來源**：Google Charts gallery 係對照圖表選擇方法，**未喺 Scriptable 使用其 JS 套件**；部分 Apple HIG 網頁於非 JS 檢索只回傳入口，唔將佢們計成已逐段全文驗證。
- **來源驗證層級**：已獨立瀏覽關鍵內容頁及其出版商官方索引；完整表格對每個 URL 作可追溯登記，GitHub CI 僅驗證 URL 格式、唯一性與分類數量。**100 URL ≠ 100 獨立實驗，亦唔代表 GitHub CI 對 100 個網站全部即時 HTTP 成功。**
- 不會為追夠 100 個而誤稱每條都直接證明細 Widget 應有七日圖；實際設計係核心來源證據 + 用戶功能要求 + 有約束嘅實作推論。

## 本輪測試與可複現驗收

1. 以 GitHub 原程式與 mock Scriptable `buildWidget('small')` 建構 7 日柱圖，核對 `DrawContext` 畫布高度、7 個 weekday label、今日本月及7日合計、本月交易數。
2. 跟同一交易樣本計算 7 日淨值（含負數）與月淨值，確保兩者無混淆。
3. 保留 Medium 一張 14 日圖、Large 分類付款交易、iPad Extra Large 兩張較長圖；驗證資料總和與路由不變。
4. 零交易、全退款、只有 FX pending、閏年／跨月／跨年 7 日圖都要測試。
5. 成功通過 repo 既有 App Route、Shortcuts/Tap Card、自訂付款、Remark、刪除、FX、Widget 大小及 source hygiene CI。
6. **最後實機驗收仍未完成**：Scriptable → Expense → 預覽 Small／Medium／Large，iPad 另預覽 Extra Large。根據真實截圖先可以確認 141pt 小屏完全無裁切。


## 附錄：100 個來源完整連結與用途

| # | 原始來源 | 來源機構 | 在本研究用於 |
|---:|---|---|---|
| 1 | [alert](https://docs.scriptable.app/alert/) | Scriptable | API 實作／資料儲存 |
| 2 | [args](https://docs.scriptable.app/args/) | Scriptable | API 實作／資料儲存 |
| 3 | [color](https://docs.scriptable.app/color/) | Scriptable | API 實作／資料儲存 |
| 4 | [config](https://docs.scriptable.app/config/) | Scriptable | API 實作／資料儲存 |
| 5 | [data](https://docs.scriptable.app/data/) | Scriptable | API 實作／資料儲存 |
| 6 | [dateformatter](https://docs.scriptable.app/dateformatter/) | Scriptable | API 實作／資料儲存 |
| 7 | [device](https://docs.scriptable.app/device/) | Scriptable | API 實作／資料儲存 |
| 8 | [drawcontext](https://docs.scriptable.app/drawcontext/) | Scriptable | API 實作／資料儲存 |
| 9 | [filemanager](https://docs.scriptable.app/filemanager/) | Scriptable | API 實作／資料儲存 |
| 10 | [font](https://docs.scriptable.app/font/) | Scriptable | API 實作／資料儲存 |
| 11 | [image](https://docs.scriptable.app/image/) | Scriptable | API 實作／資料儲存 |
| 12 | [importmodule](https://docs.scriptable.app/importmodule/) | Scriptable | API 實作／資料儲存 |
| 13 | [keychain](https://docs.scriptable.app/keychain/) | Scriptable | API 實作／資料儲存 |
| 14 | [lineargradient](https://docs.scriptable.app/lineargradient/) | Scriptable | API 實作／資料儲存 |
| 15 | [listwidget](https://docs.scriptable.app/listwidget/) | Scriptable | API 實作／資料儲存 |
| 16 | [pasteboard](https://docs.scriptable.app/pasteboard/) | Scriptable | API 實作／資料儲存 |
| 17 | [path](https://docs.scriptable.app/path/) | Scriptable | API 實作／資料儲存 |
| 18 | [point](https://docs.scriptable.app/point/) | Scriptable | API 實作／資料儲存 |
| 19 | [rect](https://docs.scriptable.app/rect/) | Scriptable | API 實作／資料儲存 |
| 20 | [request](https://docs.scriptable.app/request/) | Scriptable | API 實作／資料儲存 |
| 21 | [script](https://docs.scriptable.app/script/) | Scriptable | API 實作／資料儲存 |
| 22 | [sfsymbol](https://docs.scriptable.app/sfsymbol/) | Scriptable | API 實作／資料儲存 |
| 23 | [size](https://docs.scriptable.app/size/) | Scriptable | API 實作／資料儲存 |
| 24 | [textfield](https://docs.scriptable.app/textfield/) | Scriptable | API 實作／資料儲存 |
| 25 | [urlscheme](https://docs.scriptable.app/urlscheme/) | Scriptable | API 實作／資料儲存 |
| 26 | [webview](https://docs.scriptable.app/webview/) | Scriptable | API 實作／資料儲存 |
| 27 | [widgetdate](https://docs.scriptable.app/widgetdate/) | Scriptable | API 實作／資料儲存 |
| 28 | [widgetimage](https://docs.scriptable.app/widgetimage/) | Scriptable | API 實作／資料儲存 |
| 29 | [widgetstack](https://docs.scriptable.app/widgetstack/) | Scriptable | API 實作／資料儲存 |
| 30 | [widgettext](https://docs.scriptable.app/widgettext/) | Scriptable | API 實作／資料儲存 |
| 31 | [widgets](https://developer.apple.com/design/human-interface-guidelines/widgets) | Apple HIG | 裝置尺寸、文字及互動 |
| 32 | [layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Apple HIG | 裝置尺寸、文字及互動 |
| 33 | [typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Apple HIG | 裝置尺寸、文字及互動 |
| 34 | [color](https://developer.apple.com/design/human-interface-guidelines/color) | Apple HIG | 裝置尺寸、文字及互動 |
| 35 | [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Apple HIG | 裝置尺寸、文字及互動 |
| 36 | [charts](https://developer.apple.com/design/human-interface-guidelines/charts) | Apple HIG | 裝置尺寸、文字及互動 |
| 37 | [dark mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) | Apple HIG | 裝置尺寸、文字及互動 |
| 38 | [sf symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) | Apple HIG | 裝置尺寸、文字及互動 |
| 39 | [lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) | Apple HIG | 裝置尺寸、文字及互動 |
| 40 | [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | Apple HIG | 裝置尺寸、文字及互動 |
| 41 | [search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) | Apple HIG | 裝置尺寸、文字及互動 |
| 42 | [widgetfamily](https://developer.apple.com/documentation/widgetkit/widgetfamily) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 43 | [widgetfamily / systemsmall](https://developer.apple.com/documentation/widgetkit/widgetfamily/systemsmall) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 44 | [widgetfamily / systemmedium](https://developer.apple.com/documentation/widgetkit/widgetfamily/systemmedium) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 45 | [widgetfamily / systemlarge](https://developer.apple.com/documentation/widgetkit/widgetfamily/systemlarge) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 46 | [widgetfamily / systemextralarge](https://developer.apple.com/documentation/widgetkit/widgetfamily/systemextralarge) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 47 | [supporting additional widget sizes](https://developer.apple.com/documentation/widgetkit/supporting-additional-widget-sizes) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 48 | [creating a widget extension](https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 49 | [keeping a widget up to date](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 50 | [developing a widgetkit strategy](https://developer.apple.com/documentation/widgetkit/developing-a-widgetkit-strategy) | Apple WidgetKit | 裝置尺寸、文字及互動 |
| 51 | [non text content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 52 | [info and relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 53 | [meaningful sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 54 | [sensory characteristics](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 55 | [orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 56 | [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 57 | [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 58 | [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 59 | [images of text](https://www.w3.org/WAI/WCAG22/Understanding/images-of-text) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 60 | [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 61 | [non text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 62 | [text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 63 | [content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 64 | [keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 65 | [no keyboard trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 66 | [pause stop hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 67 | [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 68 | [page titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 69 | [focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 70 | [link purpose in context](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 71 | [headings and labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 72 | [focus visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 73 | [focus not obscured minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 74 | [pointer gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 75 | [pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 76 | [label in name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 77 | [dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 78 | [target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 79 | [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 80 | [error prevention legal financial data](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data) | W3C WCAG22 | 文字可讀、對比、輸入及無障礙交叉檢查 |
| 81 | [data visualization / overview / ](https://www.ibm.com/design/language/data-visualization/overview/) | IBM Design | 圖表表達及認知負荷 |
| 82 | [data visualization / charts / ](https://www.ibm.com/design/language/data-visualization/charts/) | IBM Design | 圖表表達及認知負荷 |
| 83 | [data visualization / design / basics / ](https://www.ibm.com/design/language/data-visualization/design/basics/) | IBM Design | 圖表表達及認知負荷 |
| 84 | [data visualization / design / usage / ](https://www.ibm.com/design/language/data-visualization/design/usage/) | IBM Design | 圖表表達及認知負荷 |
| 85 | [typography / type scale / ](https://www.ibm.com/design/language/typography/type-scale/) | IBM Design | 圖表表達及認知負荷 |
| 86 | [dashboards_best_practices.htm](https://help.tableau.com/current/pro/desktop/en-us/dashboards_best_practices.htm) | Tableau | 圖表表達及認知負荷 |
| 87 | [dashboards_refine.htm](https://help.tableau.com/current/pro/desktop/en-us/dashboards_refine.htm) | Tableau | 圖表表達及認知負荷 |
| 88 | [dashboards_organize_floatingandtiled.htm](https://help.tableau.com/current/pro/desktop/en-us/dashboards_organize_floatingandtiled.htm) | Tableau | 圖表表達及認知負荷 |
| 89 | [dashboards_dsd_create.htm](https://help.tableau.com/current/pro/desktop/en-us/dashboards_dsd_create.htm) | Tableau | 圖表表達及認知負荷 |
| 90 | [bp_visual_best_practices.htm](https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm) | Tableau | 圖表表達及認知負荷 |
| 91 | [dashboards preattentive](https://www.nngroup.com/articles/dashboards-preattentive/) | NNGroup | 圖表表達及認知負荷 |
| 92 | [designing effective infographics](https://www.nngroup.com/articles/designing-effective-infographics/) | NNGroup | 圖表表達及認知負荷 |
| 93 | [clutter charts](https://www.nngroup.com/articles/clutter-charts/) | NNGroup | 圖表表達及認知負荷 |
| 94 | [choosing chart types](https://www.nngroup.com/articles/choosing-chart-types/) | NNGroup | 圖表表達及認知負荷 |
| 95 | [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | NNGroup | 圖表表達及認知負荷 |
| 96 | [columnchart](https://developers.google.com/chart/interactive/docs/gallery/columnchart) | Google Charts | 圖表類型比較（不使用其雲端套件） |
| 97 | [linechart](https://developers.google.com/chart/interactive/docs/gallery/linechart) | Google Charts | 圖表類型比較（不使用其雲端套件） |
| 98 | [barchart](https://developers.google.com/chart/interactive/docs/gallery/barchart) | Google Charts | 圖表類型比較（不使用其雲端套件） |
| 99 | [areachart](https://developers.google.com/chart/interactive/docs/gallery/areachart) | Google Charts | 圖表類型比較（不使用其雲端套件） |
| 100 | [table](https://developers.google.com/chart/interactive/docs/gallery/table) | Google Charts | 圖表類型比較（不使用其雲端套件） |

### 來源數量核對
- Scriptable：30 個 URL
- Apple HIG：11 個 URL
- Apple WidgetKit：9 個 URL
- W3C WCAG22：30 個 URL
- IBM Design：5 個 URL
- Tableau：5 個 URL
- NNGroup：5 個 URL
- Google Charts：5 個 URL
- **合計：100 個不重複來源 URL**，以 7 個來源類別分類。

## 研究結果標籤（保留／更新／修正／新增）
- **Retained**：本月／今日指標、有效 HKD 淨支出、同一個本機資料庫、原有 Small/Medium/Large/iPad XL 家族、Tap Card/Shortcut。
- **Updated**：Small 加回近7日圖、7個原生星期文字、近七日合計、縮小裝飾 padding。
- **Corrected**：v3.15 將「小 Widget＝唔放圖」當成必然邏輯，與使用者原本需求及 Apple 資訊密度平衡觀點不符，已改回。
- **New**：Small 必須有七日資料點、每點有相應星期文字同文字尺寸檢查嘅回歸測試；跨月／退款驗證。
