# Expense Tracker HK — Version History / 版本紀錄

## [3.22.0] — 2026-11-05

### Today-first Small, split Medium with solid pie, richer Large
- **Small:** header becomes *今日支出 + 今日有效交易筆數* instead of 11月/月交易筆數. Big amount shows **today's net HKD spend**, and the row formerly labelled 最近七日 now displays **本月支出 + current monthly net HKD**. Removed 最多分類 completely to give the monthly daily bar chart more space.
- **Date integrity:** all monthly daily bars sample **calendar 1st through today's date**, not the old seven days mislabeled as monthly; axis says 1日 → 今日. Refunds remain negative signed bars, zero/unconverted amounts are not invented.
- **Medium:** two real columns. Left reuses exactly the Small today/month/day-bars panel; right is a **solid category Pie Chart**, not a Donut nor stacked bar. The Pie and legend use Top 2 + 其他 from positive **gross purchases before refunds**.
- **Large:** rebuilt as a daily-count header, dual 今日／本月 KPI, a larger month-to-date net daily chart, category **Pie** with legend, payment composition chart and up to three recent transactions (two narrow). Refund amounts are shown when present.
- **Extra Large:** retain established iPad 30-day, 6-month, category Donut and payment composition charts to protect existing iPad behavior.
- **Safety/compatibility:** no change to Tap Card automation, one-tap quick entry, manual add/edit/delete/Remark, flexible payment methods, local JSON, FX safeguards, refunds, Numbers six-field bridge or Scriptable script name.

### QA
- Added explicit Today-vs-Month/TodayCount assertions, month-to-date chart length and axis checks, pure solid Pie chart `Path` and no inner cutout tests, all Widget family and size checks, refunds, pending FX, and local transaction schema preservation.
- **Device pixel inspection remains unverified until native Scriptable previews are checked.** Mock height is a guardrail only.
- [Design contract and testing](../../docs/EXPENSE_WIDGET_DESIGN_V3_22.md).

## [3.21.0] — 2026-11-05

### Independent real-device screenshot audit and conditional chart semantics
- Rebuilt the research from the user's **actual 1-page PDF with Small/Medium/Large screenshots** and independently checked Apple HIG, Scriptable DrawContext/Path/ListWidget, USWDS, IBM, Datawrapper and WCAG; previous URL indexes are context, not evidence. [v3.21 research and evidence matrix](../../docs/EXPENSE_WIDGET_RESEARCH_AUDIT_V3_21.md).
- **Sparse day correction:** when <=2 dates have records, 7/14/30-day trend displays equal-height date activity markers rather than a giant isolated HKD bar. The heading explicitly says 記帳日分佈 and shows the active-day denominator, so this is not misrepresented as an amount comparison. With >2 recorded days, the original signed net HKD amount bars remain.
- **Small:** 7 native weekday labels accompany the seven daily buckets, with improved balance and no repeated same HKD amount.
- **Medium:** retains two independent visualizations and now labels top two gross spending categories and percentages rather than displaying a cut-off payment method with little value.
- **Large:** explicitly labels category and payment shares as 退款前, makes the payment composition thicker, allows 3 recent full-width rows (2 on narrow widths), and includes all 4 donut legend segments when applicable.
- **iPad Extra Large:** 30-day and six-month charts use activity timelines when records are sparse; otherwise they remain amount trend charts. This preserves four charts and existing compact/full iPad layouts.
- **Never changed:** transaction schema, Tap Card/Shortcuts, local JSON, edit/delete, refunds, unconverted foreign-currency safeguards, flexible payment names, Remark, and Numbers six-column bridge.

### QA
- Added weekday and sparse-timeline geometry tests plus signed-vs-gross data test invariants. Node mocks and CI cannot certify pixel-level native iPhone/iPad display. Updated iPad real-device screenshots remain outstanding.

## [3.20.0] — 2026-11-05

### Charts-first redesign v2 — all four sizes
- Research comparison of Apple Widgets and Charts HIG, Scriptable APIs and real widget designs (MoneyCoach, Spendee, Dime, Spendient). See [full independent redesign brief](../../docs/EXPENSE_WIDGET_REDESIGN_V2_V3_20.md).
- **Small:** one legible month-spend KPI, seven-day signed micro bars and highest gross-spend category share (1 chart). No triple repetition of a single HKD amount.
- **Medium:** 14-day net-spending micro chart + gross category stacked-composition bar (2 charts), always retains time context even if only one recorded day.
- **Large:** 14-day signed bars, true category donut rendered via native Scriptable `Path`, and payment composition stacked bars (3 charts), plus 1–2 recent transactions.
- **Extra Large (iPad):** 30-day daily net bars, six-month monthly net bars, category donut and payment stacked bar (4 charts), up to six recent transactions in three columns (three on the smallest iPads).
- **Accounting semantics:** category/payment ratios use **positive gross charges before refunds**, with separate net monthly total and refund amount; prevents impossible negative donut wedges. All charts exclude pending currency conversion, preserve signed net refunds and use the existing canonical 食飯 display label.
- Removed unused helpers inherited from previous widget design generations. No new third-party libraries, WebView, API calls, cloud storage or JSON schema migrations.

### Regression and compatibility
- New simulated Scriptable `DrawContext` with `Path`/ellipse mocks tests actual donut sectors and all four chart counts, positive gross vs net refund reconciliation, empty cases, single-day HK$200.30, iPad, 320pt and 393pt limits.
- Retains the same local `transactions.json` ledger, Tap Card and Shortcuts, manually editable Remark, dynamic payments, swipe-delete, FX safeguards, quick entry and Numbers six-column bridge.
- **Real-device Scriptable widget screenshot inspection remains pending.** Node mocks are not Apple-native pixel rendering.

## [3.19.0] — 2026-11-05

### Clean-sheet redesign (all Widget families)
- Replaced the **entire old Widget presentation layer**, not just spacing and words. Retains the existing validated local JSON ledger and all Shortcuts/Numbers/FX/edit/delete interfaces.
- **Small:** elegant month-spend hero + most meaningful category and a seven-day *equal-cell expenditure heatstrip*, not the old giant lone column. Every weekday remains visible with native text, and active-day intensity reflects genuine HKD net values.
- **Medium:** adapts by data density. With <=1 active day in the last fourteen days, replaces a misleading one-bar 14-day chart with two ranked categories, actual amounts and preferred payment method. With multi-day activity, shows a compact signed 14-day trend instead.
- **Large:** structured full-width monthly hero, compact 14-day activity graph, ranked categories, actual payment names and full-width recent transactions. Font size stays >=11pt, and narrow devices reduce row counts rather than aggressively shrink text.
- **Extra Large:** independent three-column iPad console: 30-day trend plus six-month chart, Top-5 ranked categories, Top-4 payment methods and six transactions split into three columns. No assumption that iPhone supports the iPad-only family.
- Keeps high-value contextual information without printing the same HK$ amount three times; `monthOnlyToday` is established by **transaction dates**, not by coincidentally equal net totals.
- Missing MerchantName falls back to an informative category/payment display label without changing persisted data. Refunds stay signed, pending FX is not counted as HKD.
- Reuses one-pass summary aggregation and safe null-prototype payment/category maps; removes prior presentation helpers instead of stacking more cosmetic patches.

### Verification / limitations
- Added an all-family offline Scriptable view-tree regression including the user's HK$200.30 one-active-day screenshot, 7-day heatstrip, sparse versus multi-day layouts, 320pt small devices, 393pt devices, foreign-currency pending, negative refunds, `__proto__` payment labels, iPad analytics and ledger immutability.
- Retains full repository lint / Shortcuts / Dashboard edit-delete / automatic version checks and exact matching legacy script mirror.
- **Important:** mocked Scriptable structure tests cannot certify final native iPhone screenshots. Final real-device visual acceptance remains outstanding.

## [3.18.0] — 2026-11-05

### Corrected — Screenshot-first visual acceptance
- Reopened the actual user-submitted one-page PDF with Small/Large/Medium Widget screenshots. The earlier v3.17 CI passed without detecting that Large left approximately the lower quarter to third visually empty, Medium displayed HK$200.30 three times, and important category/merchant text was cramped.
- **Small:** keeps seven actual daily buckets, 7 native weekday labels and the primary monthly HKD value. Date-based `monthOnlyToday` replaces the unsafe assumption that equal *net sums* mean every transaction occurred today (offsetting prior refund edge case).
- **Medium:** eliminates repeated month/today/week HKD when all records are from today. Shows 14-day chart with active-day count and explicit best category/payment information, using room for useful text rather than an empty half-chart.
- **Large:** restores full-width recent transactions (up to 4 on normal iPhones, 2 on very narrow screens) instead of a cramped half-column list. Adapts chart height to sparse activity and shows separate Top 3 categories, Top 2 payment methods, and calculated **other payment remainder** (HK$15.30 in the synthetic screenshot example).
- **Extra Large (iPad):** uses contextual amounts to avoid triple-value duplication, retains two charts, Top 5 categories, Top 3 payments and six recent transactions. Layout has not been validated on a real iPad.
- When the stored MerchantName is blank or "未提供商戶", recent Widget rows now display a meaningful Merchant Type / payment label fallback *without writing a guessed merchant into the database*.

### Research / governance
- Independently rebuilt `docs/EXPENSE_WIDGET_SCREENSHOT_RESEARCH_104_V3_18.md` with **104 additional unique official design-system reference URLs** not in either old 100-source list. Distinguishes direct primary-source reviews from official-index reference entries: not all 104 pages were read and none is misrepresented as 104 independent empirical trials.
- Added regression checks for partial refunds, equal-value-but-different-day cases, top-two payment remainder, null merchant label fallback, and Small/Medium/Large size limits.
- Preserved all tap-to-record, manual, FX, refunds, 12 categories (食飯), flexible payment names, local JSON and Numbers six-column fields. No telemetry, external images, new APIs or database migration.
- Running tests cannot establish **real-device pixel-perfect appearance**. iPhone/iPad Scriptable preview screenshots remain the release acceptance evidence.

## [3.17.0] — 2026-11-05

### Visual redesign — all four Widget families
- Redesigned Small, Medium, Large and iPad Extra Large together, responding to a real device screenshot of the previous Small that duplicated HK$200.30 across month/today/week and looked visually unbalanced.
- **Small:** 7 native weekday labels and 7-day bar chart remain; visually compact 22pt month total; duplicate-aware secondary labels show "今日 本月全部" and "近7日 1日有紀錄" when otherwise the same HK$ amount would be repeated three times. Real amounts remain intact.
- **Medium:** distinct left metrics / right 14-day chart with native end labels and compact footer showing the top spend category and most-used payment method.
- **Large:** reorganized into a main KPI card, signed 14-day chart and two side-by-side analysis panels (top three categories and two payment methods/latest transactions), with a bounded layout for smaller iPhones.
- **Extra Large:** new iPad analytic two-panel design with 30-day and six-month charts, top five spend categories, top three payment methods, six recent transactions in three columns and unresolved-FX status in the KPI header.
- New consistent dark color tokens, restrained lavender/mint highlights, smaller rounded panels, readable native text, updated weekday bars with subtle zero-day markers and no mandatory third-party visual assets.
- Shorter iPhone screen sizes receive height-aware Medium charts. Compact Large sections reduce clipping risk; iPad recent transaction columns reduce vertical scroll/overflow.
- All amounts still use validated converted HKD; negative refunds and zero-net categories retain correct treatment. No edits to local JSON schema, quick entry, Tap Card automation, FX, remark/edit/delete, or Apple Numbers six-column output.

### Validation / evidence
- Reviewed the user's actual Small Widget screenshot and rebuilt the design hierarchy against current Apple HIG Widgets, Scriptable ListWidget/WidgetStack and data chart UX sources.
- Added screenshot-matched test data (HK$200.30 repeated month/today/week), tests for seven real daily bars, seven native weekday labels, minimum font sizes and conservative Small/Medium/Large height budgets.
- Existing widget view-tree tests, app routing, import, dashboard, edit, delete, compatibility, version mirror and source cleanliness checks remain required in CI.
- Node mocks do not perform native iPhone/iPad pixel rendering. Actual Scriptable previews remain necessary for final visual acceptance.

## [3.16.0] — 2026-11-05

### Corrected regression — Small Widget 7-day expenses restored
- v3.15 incorrectly removed the Small Widget's useful seven-day daily net spending chart in the name of simplicity. **v3.16 restores it** and records the correction in `docs/EXPENSE_WIDGET_RESEARCH_100_V3_16.md`.
- Small Widget now displays **month net HKD**, **today net HKD**, **7-day net sum**, **7 actual daily bars**, **7 native weekday labels** and **current-month transaction count** (or a pending-data warning). All Small text uses native Scriptable `WidgetText` at >=11pt with a 20pt month figure; DrawContext only draws bars, not tiny text.
- Removed the old nested hero/card spacing, tightened Small-only padding, and provided a conservative 141pt vertical layout estimate, not a claim of on-device measured fit. Kept values compact and readable.
- Preserved Medium 14-day daily chart, Large ranked categories/payments/transactions, and iPad Extra Large 30-day + six-month dashboards; also made the shared widget heading metadata 11pt.

### Research and QA
- Rebuilt the report from scratch with **100 unique official source URLs** across Scriptable, Apple HIG, Apple WidgetKit, WCAG 2.2, IBM Design, Tableau, Nielsen Norman Group and Google Charts. Evidence tiers clearly separate directly inspected design/API sources from supporting cross-checks and bibliography-only references; 100 URLs are not 100 independent empirical studies.
- Compared prior v3.15 findings against vendor device dimensions (Small 141–170pt) and accessibility guidance, then constrained the restored chart to 30pt plus native weekday labels.
- Added tests for 7-day chart restoration, 7 weekday labels, all Small text >=11pt, approximate 141pt vertical height, and 100-source provenance integrity.
- **No data migration, new network requests, App/Shortcuts/Tap Card changes, Numbers column changes or new API keys.**
- Real iPhone 141pt small widget rendering, iPad and StandBy appearances require on-device preview; mock checks are not pixel-perfect screenshots.

## [3.15.0] — 2026-11-05

### New — truly distinct Widget information layers
- **Small (iPhone/iPad):** streamlined month spend, today's net, valid-month record count and unresolved indicator. Removed its repeated mini chart.
- **Medium (iPhone/iPad):** adds 14-day signed daily bars, 7-day net and leading category; uses a split KPI/plot layout, not a stretched Small.
- **Large (iPhone/iPad):** adds 14-day daily trend, top **three** category ranking bars, top **two** actual payment labels and two latest transactions, plus unresolved FX/date status.
- **Extra Large (iPad only):** a true two-column analytical dashboard with **30-day** daily bars, **six-month** monthly comparison, top **five** categories, top **three** dynamically discovered payment methods, **six** recent transactions, refund count and unresolved status. iPhone cannot offer this size under Apple WidgetKit.
- Lock-screen accessory families remain compact and separate. Optional `Widget Parameter = quick` continues to open manual entry.

### Audit / refactor — source cleanliness and data correctness
- Replaced repeated Widget data scans with a **single-pass aggregation** of valid HKD transactions into month/day/six-month/category/payment/refund summaries, plus a bounded latest-six sort.
- Hardened general `groupSum()` dictionary keys against `__proto__` and other JavaScript prototype-member collisions by using `Object.create(null)`.
- Retain **active zero-net** categories/payment methods whose purchases and refunds cancel out rather than making them disappear.
- Removed the unused former Dashboard `barsSVG()` renderer and `fmt()` helper left by older UI rewrites; did **not** delete intentional compatibility mirrors or data-recovery files.
- Preserved signed refund data, pending-FX exclusions, original Card/Payme labels, canonical `食飯` category, open-text Payment Type, optional Remark, Tap Card import rules and original Numbers output.
- No new network calls, third-party libraries or keys.

### Independent research / testing
- Added `docs/EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md`: updated evidence based on **14 checked vendor/standards documents**, source code audit, risks and retained/updated/corrected/new findings. The old 100-link design reference index is explicitly **not** treated as 100 live-verified research studies.
- Added `tests/expense-widget-sizes.test.js`: fully simulated Scriptable widget view-tree tests for all four families, accessory-preserving code, charts, custom payments, refund, pending FX, zero records and Quick Widget routing.
- Added `tests/expense-source-cleanliness.test.js`: dead-code, obvious credential-pattern, unsafe evaluator, mirror equality and independent-version hygiene checks.
- The actual WidgetKit/iPad pixel layout cannot be certified by Node mocks; use Scriptable's built-in preview on real devices for final acceptance.

## [3.14.0] — 2026-11-05

### Changed — Canonical Merchant Type 食飯
- User-requested canonical category is now **食飯**, not 食物, in manual-entry buttons, Dashboard category tiles, payment reporting, filtered transaction labels, normalization and editor suggestions.
- Legacy `食物`, `餐飲`, `飲食`, `Restaurants`, `食肆`, `吃飯` and similar aliases map to 食飯 at display/import boundaries. `originalCategory` and stored historical transaction rows are preserved without migration.
- All 12 canonical category labels remain consistent across views. Existing user categories/custom payment labels and local Numbers bridge stay intact.

### Redesigned — premium, Apple-inspired dark mobile dashboard
- Rebuilt the visual hierarchy from research: branded header + easy Quick Add, small section navigation, single spacious gradient month-spend hero, compact today/7-day metrics, collapsible data-status diagnostics, clear category analysis and transaction lists.
- Category overview retains 12 clickable tile filters but adds distinct thin-stroke icons, meaningful accents and proportional mini-bars, plus ranked bars for top three categories. Months without transactions keep blank category values.
- Payment grid uses first-letter monograms, no external brand assets, and continues to discover arbitrary payment types (Payme/AlipayHK/custom). Card remains a separate raw input.
- Transaction rows gain small Merchant Type glyphs and improved text hierarchy; Remark search, category/payment/card filters, edit and accessible ⋯/left-swipe delete remain.
- Existing compact 14-day / 6-month trends, refund handling and optional category donut are preserved; empty states remain honest and concise.
- Stronger focus styles, responsive 365–650px layouts, reduced motion and iPhone top safe area without any new network, API, tracking or library dependency.

### Research / QA
- Added `docs/EXPENSE_DASHBOARD_RESEARCH_100.md`: exactly **100 distinct linked documents** across 40 W3C WCAG Understanding pages, 30 IBM Carbon components, 14 Apple HIG pages, 12 Nielsen Norman Group pages and 4 Tableau/Baymard documents; clearly distinguishes reading map from primary design evidence.
- Added regression checks for 100 unique references and the new canonical Food category, including historical category aliases, HTML structure and interactive controls.
- JavaScript, mocked Scriptable app, import/Numbers, saving, editing, deletion and mirror/version CI tests run before merge. Actual device-native WebView rendering still requires visual acceptance on iPhone.

## [3.13.0] — 2026-11-05

### Redesigned — iPhone dashboard
- Reserve top safe area so the dashboard header no longer overlaps the iPhone status bar and Scriptable's native WebView controls.
- Reorder mobile content: clear header + quick add, compact KPIs, collapsible diagnostics, twelve tappable Merchant Type tiles, observed payment methods, searchable/editable/deletable transaction list, and concise trend chart.
- Combine two oversized charts into one compact 14-day / 6-month switcher; empty periods display a short no-data state rather than a large blank chart. Display negative net amounts below baseline.
- Move transaction search/edit/delete above trend charts, and make the category donut expandable to reduce scrolling. Empty category values remain blank.

### Corrected — flexible payments and historical Merchant Type
- Payment Type is **free text** and optional, not constrained to a fixed list. Payme, AlipayHK, Apple Pay and user-defined labels appear distinctly, with dynamic filter options based on existing transactions.
- Preserve the raw Card separately; optionally infer credit card from VISA/Mastercard branding when a paymentType is not explicit.
- Manual entry now offers a text field + suggestions, while Dashboard editing accepts custom payment names. Unknown payment labels are not guessed.
- `食飯`, `用餐`, `膳食`, `餐費` are recognized as 食物 for reporting. Historical originalCategory and stored transaction rows are not rewritten.

### Regression / compatibility
- Prior Apple Intelligence/Tap Card Dictionary inputs, nonzero-amount/refund rules, quick launch, local DB, duplicate detection, read-back validation, FX, notes, CSV and Numbers six-column bridge remain unchanged.
- New tests cover mobile safe-area, compact trends, dynamically observed payment methods, preservation of old categories, search/filter and editing. Physical iPhone WebView layout requires on-device validation.

## [3.12.0] — 2026-11-05

### Added — Merchant Type, Payment Type and Remark
- Standardized the 12 Merchant Types: 食物、飲品、娛樂、日用品、交通、旅行、衣服、水電、醫療、訂閱、進修、運動, across manual entry, transaction editor and Dashboard. Updated icon tiles and added distinct 飲品.
- Dashboard now shows all 12 categories every month. Empty categories show blank values. A category tile is also a filter of the transaction list.
- Added payment-type summary and filters, with a dedicated optional `paymentType` alongside the existing optional `card` display name: 信用卡、扣賬卡、現金、八達通、轉數快、銀行轉帳、電子錢包、其他. An unknown payment type remains blank, never guessed.
- Added optional `remark` to AI/Shortcut normalization, manual-entry WebView, editing, transaction display and keyword search. Search also covers Merchant Type, payment type, card name, merchant and date.
- Added transaction filters for category, payment type and card, plus a reset control.
- Included Payment Type and Remark at the END of CSV exports, preserving the previous 15-column order.

### Compatibility and safety
- Existing `transactions.json` records are **not migrated or rewritten**. Dashboard maps common legacy labels for display (餐飲→食物, 健康醫療→醫療, 超市雜貨→日用品); ambiguous unsupported history is kept under 其他／未分類.
- An explicitly supplied recognized Merchant Type takes precedence over merchant-name keyword rules.
- Legacy Card strings remain unchanged; only recognizable values (e.g., SOGO VISA, 現金, 八達通, FPS) are presented with an inferred payment type.
- Existing Shortcuts/Apple Intelligence six-key payloads remain valid, and the existing Numbers 6-column integration remains backward compatible. Numbers rows are NOT automatically updated by local edits.
- Optional fields may be blank. Zero/blank amount still never creates a transaction; refunds remain negative.
- Existing backup, disk verification, duplicate checks, quick-launch and Tap Card automation routes remain unchanged.

### Validation
- Expanded offline tests cover canonical/legacy Merchant Types, beverage vs food, category-priority override, payment inference and optional remark, HTML escaping, category/payment/card filtering, editor persistence, negative/zero and manual compatibility.
- Physical iPhone WebView and Numbers actions must still be verified on device.

## [3.11.5] — 2026-11-05

### Fixed — Shortcut Texts vs Parameter mismatch
- **Real-device screenshot root cause:** the literal `EXPENSE_QUICK_MANUAL` was entered into the Scriptable Run Script action's expanded **Texts** list, not the blue **Parameter** field. These are separate Scriptable inputs: `args.plainTexts` vs `args.shortcutParameter`.
- Recognize the quick-entry command in **either** location and immediately open the manual-entry WebView when **Run In App = ON**.
- For Texts, require exactly **one nonempty text item** equal to the command **and no supplied Parameter**. Arbitrary user notes or transaction descriptions are never treated as commands.
- A nonblank Apple Wallet/Apple Intelligence **Shortcut Parameter has priority over Texts**, protecting the pre-existing Tap Card automation even when both fields are populated.
- `quick_requires_app` diagnostics identify which source (`Texts` or `Parameter`) contained the quick-entry token.
- No database schema changes, no data clearing, and no changes to FX, manual-entry form, Dashboard, editing, deletion or widgets.

### Verification
- Full-script Scriptable mock tests: Texts command (with whitespace), Parameter command, Run In App off, multiple Texts, unrelated texts, and Wallet Dictionary priority.
- Syntax, prior transaction imports, manual form, Dashboard edit/delete and independent-version checks remain in CI.
- iPhone screen navigation and native WebView rendering cannot be fully validated in offline tests.

## [3.11.4] — 2026-11-05

### Fixed — Quick manual entry launches Scriptable but no form appears
- Added a **dedicated Shortcuts Run Script input**: the exact text `EXPENSE_QUICK_MANUAL`, using **Run In App = ON**, which opens the manual-entry WebView immediately, bypassing the main menu.
- Corrected the entry-point order so `view=manual` / `view=dashboard` URL invocations are checked **before** the generic `!config.runsInApp` no-input branch.
- If the new quick-launch text is passed without Run In App enabled, return an explicit `quick_requires_app` diagnostic instead of silently treating it as an invalid transaction.
- Keep the previous URL Scheme and quick-widget routes for compatibility. The **recommended launcher** is now the separate Run Script action with explicit Parameter and Run In App.

### Tap Card and existing data unchanged
- Existing nonempty Apple Intelligence / Wallet Dictionary and JSON transactions retain priority over URL routes; `EXPENSE_QUICK_MANUAL` is the only text recognized as a quick-entry command.
- No changes to `transactions.json` schema, widget charts, FX, editing, deleting or manual saving.
- The quick launcher never writes a transaction until the user enters a valid nonzero amount and saves.

### Verification
- Added full-script Scriptable app-route tests of both the quick Parameter with Run In App ON and an explicit error with it OFF.
- Tests also cover a URL manual deep link in a non-app configuration and normal Wallet JSON import priority.
- Real iPhone Shortcuts / Scriptable handoff must still be confirmed on device.

## [3.11.3] — 2026-11-05

### Added — One-tap manual expense launcher
- A direct URL route `view=manual` that immediately opens the existing manual expense form from a Home Screen Shortcut, skipping the Scriptable menu and Dashboard.
- Added **🔗 複製一鍵記帳網址** to the native Scriptable app menu, dynamically constructing the correct URL with `URLScheme.forRunningScript()` for the installed script name.
- Added an optional `quick` Scriptable widget parameter: tapping that separately configured widget opens the manual-entry form. The normal widget still opens Dashboard.

### Compatibility / non-regression
- Priority remains Widget → existing nonempty Shortcut Parameter / Texts import → in-app launch route, so Tap Card Apple Intelligence Dictionary automation is not changed or intercepted.
- Both direct launch and standard manual entry use the same `ExpenseTrackerHK/transactions.json`, existing nonzero validation, idempotent manual submission, backup, and disk verification.
- One tap **opens** the entry form; a valid amount and category are still required to actually save a transaction. The script never guesses amounts.

### Tests
- Full Scriptable app launch test covers `view=manual` and `view=dashboard` with no main menu.
- Explicit regression tests ensure that when valid Wallet/Shortcut Dictionary data is present, imports take precedence even if an extraneous `view=manual` URL parameter is present.
- Widget URL selection is checked for default Dashboard and optional `widgetParameter=quick`. Actual Home Screen/URL handoff must still be verified on-device.

## [3.11.2] — 2026-11-05

### Fixed — Manual entry UI on iPhone
- Resolved the v3.11.1 manual form header overlapping the iOS status bar and Scriptable WebView toolbar by reserving a safe top area.
- Removed the visually duplicated date field. The one-line date control now retains native iOS date selection using a full-size, transparent date input over the displayed date.
- Corrected amount/currency proportions and added spacing between time and payment-method controls.
- Reduced excessive vertical spacing, category-card heights, icon sizes and fixed footer height to improve visible content on smaller iPhones.
- Added narrow-screen, reduced-motion and safe-area styles; kept the existing twelve categories, day navigation and accessible labels.

### Reliability
- Manual save, category selection, Tap Card import, Dashboard edit/delete and original JSON storage are unchanged.
- New offline UI structure tests explicitly check the date control is nested once, the safe-area layout rules and compact bottom bar.
- GitHub CI verifies JavaScript and all existing integration tests; physical Scriptable WebView rendering remains a device-only check.

## [3.11.1] — 2026-11-05

### Fixed — App launch regression
- Restored the required public `dashboard()` and `addManual()` entry points after v3.11.0 renamed their previous implementations but forgot to create the new wrappers.
- Both functions now open the shared `presentExpenseWeb()` controller in Dashboard or manual-entry mode respectively.
- Removed the superseded dashboard presenter and manual Alert entry routines so the app uses one canonical WebView implementation.
- Fixed the on-device error `Can't find variable: dashboard` when selecting Dashboard, the manual-entry menu, or opening the Dashboard deep link.

### Tests
- Added full-script **Scriptable app-entry integration tests** that really execute the menu's Dashboard path, Manual Entry path and direct Dashboard deep link using mocked Alert and WebView objects.
- Prior v3.11.0 tests covered only data parsing and manual-form helpers, and therefore missed the missing function declarations. The new tests explicitly fail if either entry point is undefined or if WebView rendering fails.
- This change does **not** migrate, clear or overwrite existing transactions.json; no storage schema changes.
- iPhone WebView interaction itself remains unverified until installed on an actual device.

## [3.11.0] — 2026-11-05

### Added
- Full-screen, dark, mobile-first **手動支出記錄** in Scriptable, patterned after a category-grid expense journal.
- Date previous/next navigation and native date picker, merchant/record text, numeric nonzero amount (negative refund support), currency selector, time, and payment method (cash / Octopus / FPS / bank transfer / manually entered card).
- Twelve tappable 3-column colored vector-icon categories: 飲食、日用品、衣服、娛樂、水電、交通、投資、旅行、醫療、訂閱、進修、運動.
- Both the Scriptable **➕ 手動記帳** menu and Dashboard **＋ 手動記帳** button open the same interface. The editor and delete actions remain functional.

### Persistence and safety
- Writes valid non-tap-card entries into the existing `ExpenseTrackerHK/transactions.json` using the existing save, backup, de-duplication and disk read-back verification pipeline.
- Explicitly selected category takes precedence over merchant automatic classification. Saves source=`Manual`, selected payment source and transaction date/time.
- Rejects zero, empty, invalid amount or date, and unsupported currency; negative amounts remain valid refunds.
- Reloads the current on-disk database before inserting, preserving concurrent Shortcuts transactions; one form submission has a stable idempotency token.
- Does not call the network during saving; foreign currencies remain `pending` for optional in-app conversion.
- WebView requests use fixed internal .invalid paths without user form values; Scriptable reads inputs from the active local WebView. External URL navigation is blocked.
- A successful save resets the form, provides a success receipt, and shares the same ledger as Dashboard/Widgets.
- **Apple Numbers** rows are separate and are not automatically appended for manually entered transactions.

### Validation
- Automated offline tests cover the visual HTML, calendar/category controls, manual validation, cash/refund/FX, unique IDs, idempotency, concurrent Shortcut append, and disk read-back; prior import/edit/delete tests remain.
- Actual on-device interactive WebView rendering and button behavior require iPhone verification.

## [3.10.0] — 2026-11-05

### Added
- Swipe left on each Dashboard transaction to reveal a red **🗑️ 刪除** button, then tap and explicitly confirm before deletion. Swipe right closes the action.
- An accessible **⋯** button reveals the same action without touch; a **🗑️ 刪除交易** native menu fallback is available.
- Improved mobile-friendly swipeable transaction cards while retaining full text search and per-row editing.

### Integrity
- Validate the selected transaction and compare with latest `transactions.json` contents before deleting; reject stale/duplicate IDs.
- Preserve all other and concurrently appended transactions; save a previous-file backup and verify the disk write.
- Recalculate Dashboard immediately. Widgets refresh on the iOS schedule.
- Local deletions do not remove Apple Numbers rows or erase pre-existing local backups.

### Validation
- Syntax, import/edit/delete regression tests, duplicate/stale conflict checks, cancellation and swipe gesture simulation run in GitHub Actions.
- Actual iOS gesture and WebView callback must still be tested on device.

## [3.9.0] — 2026-11-05

### Added
- Each transaction in the Dashboard has an Edit button and full-list search by date, merchant, category, card and currency.
- Native Scriptable editor allows updates to date/time, merchant, category, currency, nonzero amount (negative refunds), and card.
- Separate in-app Edit Transaction menu provides a fallback for WebView interception limitations.

### Integrity
- Edits modify the original local transactions.json row while preserving transaction ID, source and original creation time.
- Re-read and compare the on-disk record before replacing it, to prevent overwriting edits from concurrent automations.
- Verify persistence after each update; preserve previous version through the existing save() backup.
- Recompute HKD after amount/date/currency changes, or mark foreign FX as pending.
- Rebuild Dashboard after successful save; actual iOS widget reload timing remains under iOS control.
- Empty or zero amounts, invalid dates and unapproved conflicts are rejected; cancel/no-op does not save.

### Limitations and testing
- Editing local records does not update already appended Apple Numbers rows.
- Dashboard uses an intercepted .invalid URL carrying only row index (never card/merchant/amount data). All other external HTTP navigation is blocked.
- Automated offline regression tests for editing, validation, conflict detection and FX are included; actual iPhone WebView/Alert interaction must still be verified.

## [3.8.1] — 2026-11-04

**Added**
- Per-run privacy-conscious local diagnostics at `ExpenseTrackerHK/last-shortcut-run.json` with timestamps and explicit `received`, `parsed`, `saved`, `duplicate`, `skipped`, `no_input` and `error` stages.
- In-app menu **🧪 查看 Shortcuts 記帳紀錄** showing recent local totals and latest Shortcut execution status.
- Record fatal errors in the same audit file even when a Shortcut response cannot be returned.

**Why / outcome**
- User confirmed the only present database row was inserted manually. Auto-import therefore still has an unresolved iOS execution/parameter issue; existing successful JSON simulations did not establish that a real Shortcut invoked the installed Script.
- No raw Apple Intelligence output, merchant names or card details are persisted in audit diagnostics. All code is kept offline.

**Validation**
- Offline integration scenarios for saved, duplicate, invalid and missing input; syntax and CI mirrored-source checks. Actual iPhone execution requires a new run of the installed script.
- Updating the GitHub repository alone does not change the installed `Expense` script.

## [3.8.0] — 2026-11-04

**Added**
- A Shortcuts-to-Apple-Numbers bridge. `Run Expense` now returns a Dictionary containing `shouldAppendNumbers`, `numbersRow` (six values), `status`, `receipt`, `transactionId`, `numbersRows` and `requiresBatchSync`.
- Six-column mapping in order: Date, Card, MerchantName, MerchantType, Currency, Amount. For new imports, the existing Scriptable `transactions.json` remains the primary local ledger.
- Only emit Numbers append requests for **newly inserted** transactions; repeat event IDs produce no extra row.
- Native Return Dictionary also makes local save/duplicate/invalid reasons available to Shortcuts.

**Changed / Upgrade**
- The Scriptable Shortcut **output type changes from plain text to Dictionary** (a backward-compatible data addition for correctly configured Shortcuts, but existing Show Result steps should use the `receipt` key).
- To actually write to Apple Numbers, add `If shouldAppendNumbers` → `Get Dictionary Value numbersRow` → Numbers `Add Row to Top or Bottom of Table` **after** `Run Expense`. Scriptable alone cannot append to a Numbers spreadsheet.
- Old entries in local `transactions.json` are not backfilled automatically. Do not re-run imports blindly to backfill.
- **Important consistency limitation:** an error in the later Numbers action after JSON was saved can leave Numbers missing a row; replaying the same transaction will not re-emit it automatically. Inspect/reconcile the table first.

**Tested**
- JS syntax and offline Shortcuts bridge scenarios (valid 57 HKD, nested Dictionary, JSON text, zero/empty, refunds, duplicate ID, no input, pending-FX), plus mirror/CI checks.
- iPhone Numbers action and specific user workbook were not operated remotely.

## [3.7.1] — 2026-11-04

**Fixed**
- Prevented Shortcuts/Siri transaction imports from waiting on currency-conversion API calls for unrelated old pending FX records.
- Persist and read back each valid transaction immediately; send the marked `[EXPENSE-HK-v3.7.1]` receipt without network access.
- Retained all foreign-currency transaction data; any missing HKD equivalents remain marked `pending` until the user selects **Retry FX / 重試外幣換算** from the Scriptable app menu.

**Verified by offline regression**
- Reproduced v3.7 hanging after saving an HKD transaction when a historical FX request never returned.
- Confirmed v3.7.1 completes promptly, verifies the database write and makes **zero network calls** during automated import.
- Tested native Dictionary, JSON string, nested amount, response wrapper, blank/zero values, negative refund, duplicate event and existing pending-FX records.
- The on-device iOS Shortcut still requires an installed updated script and has **not** been directly executed in these tests.

**Upgrade notes:** Replace the full existing iPhone Scriptable `Expense` code with this version. GitHub does not update installed iPhone scripts automatically. In Shortcuts, display the output of the **Run Expense** action, not the AI model `Response`.

## [3.7.0] — 2026-11-04
**Fixed**
- Read back and verify imported records from local `transactions.json` after saving.
- Introduced distinctive `[EXPENSE-HK-v3.7]` receipt to distinguish real persistence from Apple Intelligence model JSON.
- Added `args.plainTexts` fallback and enhanced transport merchant matching.

**Reference:** [v3.7 implementation](https://github.com/loktoto/Scriptable-iPhone-widget/commit/ff5d5c2800)

## [3.6.0] — 2026-11-03
**Changed / Diagnostic**
- Improved diagnostics to return input type, known keys, parser method, recognized amount and saved/duplicate status without echoing complete sensitive transactions.
- Added standalone **read-only** input diagnostic tool.

**References:** [v3.6 parser diagnostics](https://github.com/loktoto/Scriptable-iPhone-widget/commit/3a8817fb60) · [Diagnostic tool](https://github.com/loktoto/Scriptable-iPhone-widget/commit/f342765626)

## [3.5.0] — 2026-11-01
**Added**
- First committed Expense Tracker in this repo.
- Resilient parsing for native Dictionary, JSON, embedded JSON, nested amount values, bounded fallback text and legacy pipe records.
- Adaptive sizes, FX estimates, backups, and synthetic JSON example/schema.

**Reference:** [Initial v3.5](https://github.com/loktoto/Scriptable-iPhone-widget/commit/7e73e3f47f)

### Unverified older history
v3.0–v3.4 were drafts outside this public repo. They are not presented as separately verified Git releases.
