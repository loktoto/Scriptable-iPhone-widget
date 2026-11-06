# Expense Tracker — Medium Pie Chart 佈局審計 v3.23.1

更新日期：2026-11-06

## 研究方法與證據

- **實機來源：** 使用者在對話中展示了 v3.22.x Medium 以及最新 PDF 的 Medium／Small／Large 截圖；Medium 的右側空間與文字擁擠可直接觀察。沒有 v3.23.1 的真機截圖。
- **程式來源：** v3.23.0 `buildWidget('medium')` 使用 `pieSize=compact?44:55`，Pie 與三行圖例橫向排列，右欄在測試設備上的寬度約 130–155pt；程式中另有 12–15pt 無內容上間距。
- **官方規範：** [Apple HIG Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)、[Apple HIG Charts](https://developer.apple.com/design/human-interface-guidelines/charts)、[Scriptable WidgetStack](https://docs.scriptable.app/widgetstack/)。三者支持聚焦資料、有限空間內的可讀圖形、使用原生水平／垂直 Stacks、明確文字標籤。
- **限制：** 此為根據實際截圖＋原始碼的設計審計，並非100個 UX 實驗或用戶可用性量化實測。真機的 Dynamic Type 及文字裁切仍需截圖確認。

## 問題識別

先前「Pie 左、legend 右」總寬度需要容納55pt 圖與3行分類文字，但右欄本身僅約150pt，因而 Pie 太細、legend 變成截字、上下空白分佈失衡。只調 2–4pt spacers 無法根治：需要根據容器比例改變圖例方向。

## Retained / Updated / Corrected / New

| 分類 | 結果 |
|---|---|
| Retained 保留 | Medium 左欄今日／本月／每日柱圖，原有 Pie 正向消費計法，退款與未換算外幣規則，Small／Large／iPad XL 原樣 |
| Updated 更新 | Medium 右側採「標題 → 大型置中 Pie → 三欄分類圖例」；Pie 直徑由 compact 44/regular 55 改為70/82pt |
| Corrected 修正 | 取消令 Pie 擠迫的側邊三行 legend；減少原有 12–15pt 的無效上間距；每個分類有顏色＋名稱＋百分比 |
| New 新增 | `addMediumPieLegend` 三欄 grid；按螢幕寬與高度選 compact；測試多個真實設備尺寸 |

## 精確佈局

- **320pt** iPhone：Medium 292×141pt，右欄寬約130pt，Pie=70pt。
- **393pt** iPhone：Medium 338×158pt，右欄寬約153pt，Pie=82pt。
- **375pt** 及矮身414pt：採 compact 70pt，保留較充裕嘅底部餘量。
- **414pt 高身、430pt**：82pt。
- 三欄圖例每欄佔右欄三分之一，彩色5pt小方塊＋短類名（如「食飯」）在同一行，下一行是原生11pt百分比。超長分類顯示層最多兩字＋省略符，帳本存值不變。
- 顯示最多 Top2＋「其他」；若不足三類，其餘格留空而唔製造不存在的比例；無任何正向消費時顯示灰色 Pie 與「未有分類支出」。

## 驗收與風險

- GitHub CI 檢查 Widget Pie 真有填色扇區、大小70／82、圖例為3個橫向分欄而非側邊3行、各非空欄同時有類名及百分比，並保留實際 320／375／393／414／430pt Widget 高度約束。
- 不觸及 Expense.json、本機交易、Tap Card 或 Shortcuts 相關流程；無資料格式遷移。
- **不能**單靠 Mock 的 estimatedHeight 宣稱 Apple WidgetKit 實機像素百分百合格；要在更新後實機畫面觀察是否有裁字、重疊、顏色對比不足。

## 結論

Medium 真正痛點不是「Pie Chart 要多一點 spacer」，而是之前將分組方式硬擠在右欄。v3.23.1 將圖例移至大型 Pie 下方、改成緊貼的三欄原生網格，避免同時犧牲圓餅大小與文字辨識度。
