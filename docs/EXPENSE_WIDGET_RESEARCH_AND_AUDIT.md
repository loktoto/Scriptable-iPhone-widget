# Expense Tracker HK v3.15.0 — Independent Widget Research & Code Audit

**Review date:** 2026-11-05  
**Repository:** [Scriptable-iPhone-widget](https://github.com/loktoto/Scriptable-iPhone-widget)  
**Scope:** Expense Tracker source, main dashboard, local JSON/FX flow, Apple Shortcuts/Tap Card entrypoints, widget sizes, mirrors, tests; a lightweight repository-level static inventory of Bus/MTR modules.  
**Evidence standard:** Verified vendor documentation and actual repository code/tests. Previous v3.14.0 research and its 100-source bibliography were **reference points only**, never treated as ground truth.  
**Status:** Source-level audit and simulated Scriptable-widget tests; NOT an actual iPhone/iPad rendered screenshot/measurement test.

## Executive result

The old four Widget branches **already existed**, but Small/Medium/Large were repetitive combinations of month total and daily bar charts, and iPad Extra Large was mostly an expanded Large. v3.15.0 changes what each family reveals, not just its dimensions, while leaving the original local ledger and Tap Card Automation contract unchanged.

**Platform correction:** Apple lists `systemExtraLarge` as **not available on iPhone**, but supported on iPad (and Mac/visionOS). Scriptable exposes `extraLarge` / `presentExtraLarge()` on iPad; an iPhone screenshot cannot prove or enable an iPad-only family. See verified sources [S1], [S2], [S3] below.

## A. Confirmed facts — verified again against authoritative primary sources

| Claim | Independent verification | Evidence |
|---|---|---|
| More area should deliver genuinely more information | Apple HIG Widgets recommends different amounts of detail by widget family; avoid simply stretching the same small content | [S1], [S4] |
| Small/Medium/Large on iPhone; Extra Large on iPad | Apple's supported-context matrix; Scriptable config `widgetFamily` / preview API | [S1], [S2], [S3] |
| Scriptable uses native Stack/Text/DrawContext | Official `ListWidget`, `WidgetStack`, `DrawContext` property and method contracts | [S5], [S6], [S7] |
| Native widget timeline has no exact 30-minute SLA | `ListWidget.refreshAfterDate` marks earliest desired time, but iOS decides actual refresh; Apple describes reload budget | [S5], [S8] |
| Graphs need concise context and legibility | Apple HIG Charts recommends clear data hierarchy and succinct chart labels in compact space | [S9] |
| Controls should not rely solely on tiny hotspots or colour | W3C WCAG 2.2 target size, non-text contrast and reflow guidance | [S10], [S11], [S12] |
| Local file writes are not cloud backups | Scriptable FileManager local/iCloud storage and `writeString` semantics. Backup before overwrite is an app design, not an OS-guaranteed atomic transaction | [S13] |
| Tapping widgets can open the script | Scriptable ListWidget `url` and URLScheme docs; custom `quick` widget parameter is retained | [S5], [S14] |

### Primary documents actually inspected
- **[S1] Apple — Widgets, HIG:** https://developer.apple.com/design/human-interface-guidelines/widgets
- **[S2] Apple — WidgetFamily:** https://developer.apple.com/documentation/widgetkit/widgetfamily/
- **[S3] Scriptable — config:** https://docs.scriptable.app/config/
- **[S4] Apple — Supporting additional widget sizes:** https://developer.apple.com/documentation/widgetkit/supporting-additional-widget-sizes
- **[S5] Scriptable — ListWidget:** https://docs.scriptable.app/listwidget/
- **[S6] Scriptable — WidgetStack:** https://docs.scriptable.app/widgetstack/
- **[S7] Scriptable — DrawContext:** https://docs.scriptable.app/drawcontext/
- **[S8] Apple — Keeping a widget up to date:** https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date
- **[S9] Apple — Charts, HIG:** https://developer.apple.com/design/human-interface-guidelines/charts
- **[S10] W3C — Target Size (Minimum):** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- **[S11] W3C — Non-text Contrast:** https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast
- **[S12] W3C — Reflow:** https://www.w3.org/WAI/WCAG22/Understanding/reflow
- **[S13] Scriptable — FileManager:** https://docs.scriptable.app/filemanager/
- **[S14] Scriptable — URLScheme:** https://docs.scriptable.app/urlscheme/

**Important correction to the previous report:** [`EXPENSE_DASHBOARD_RESEARCH_100.md`](EXPENSE_DASHBOARD_RESEARCH_100.md) contains **100 distinct bibliographic URL entries** and an automated uniqueness check, *not* 100 individually verified live documents or 100 independent research studies. This report deliberately uses the 14 checked first-party documents above as decision evidence. The previous 100 links remain a broad reference appendix only; a successful count test is not evidence of HTTP availability or claim validation.

## B. Designed information ladder — zero repetitive filler

| Dimension | Surface | Main question | New information relative to smaller size |
|---|---|---|---|
| Small | iPhone/iPad | 本月洗咗幾多？ | Month net spending, today's amount, valid month count; **no repeated chart** |
| Medium | iPhone/iPad | 最近有冇升跌？ | 14-day spark bars, 7-day net, top merchant category, unresolved count |
| Large | iPhone/iPad | 邊度洗得最多？ | 14-day chart + top 3 category bars + top 2 payment methods + 2 recent transactions |
| Extra Large | **iPad** | 本月支出全貌點樣？ | 30-day daily chart **and** six-month monthly chart, top 5 categories, top 3 payment methods, six transactions in two columns, refund count, unresolved FX/date count |
| Accessory | Lock Screen | 一眼睇總數 | Only small, meaningful monthly/today values; no crowded detail |

No fake budgets, balances, forecast, investment returns or account-wide net worth are shown because these values are not present in the Expense Tracker's local transaction source. All values labelled HKD use existing finite `amountHKD`, with pending/unknown FX excluded. “淨支出” includes refunds as negative transactions, and month transaction counts refer to records with valid dates and converted HKD. Chart colour is not the only cue: title and money labels also describe the data.

## C. Source audit — retained / corrected / new

### Retained after verification
1. **Local-ledger rule:** `ExpenseTrackerHK/transactions.json` stays local; no schema migration, deletion or ledger rewrite.
2. **Input contract:** `amount` must be a valid nonzero number; negative values are refunds; other fields (Card/Remark/PaymentType) may be empty.
3. **Routing:** Wallet Tap Card Dictionary and Shortcuts import remain distinct from the manual form and `quick` Widget Parameter deep link.
4. **Existing UI:** Dashboard search/edit, Remark, payment/card/merchant filters and swipe-to-delete with confirmation remain.
5. **Backups:** Before-overwrite `transactions.previous.json` recovery copy retained; it does **not** replace an off-device backup.

### Corrected defects / unnecessary work
1. **Prototype-sensitive aggregation:** the old `groupSum()` used `{}` as a map for variable keys; user-controlled payment labels like `__proto__` could collide with Object prototype members. Changed to `Object.create(null)` and converted keys to strings.
2. **Repeated widget aggregation:** the old summary filtered the same ledger for current month, each day, weekly metrics and categories in multiple passes. New `widgetSummary()` calculates day, six-month, current-month category/payment distributions, refunds and unresolved counts in a single walk through all stored transactions, with only a separate bounded recent-transaction sort.
3. **Dead chart code:** legacy `barsSVG()` and unused `fmt()` were left after the previous Dashboard bar-chart replacement; removed them, retaining the actively used `pieSVG()` and `dashboardTrendSVG()`.
4. **Zero-net category ambiguity:** purchases minus refunds can sum to HK$0 without being “no activity”. New aggregation retains active zero-net categories/payment methods using counts, rather than filtering them out solely because their signed sum is zero.
5. **Almost identical widget faces:** Small loses the redundant chart; Medium gains a chart and first category; Large adds payment/transactions; iPad Extra Large becomes a two-column analytical layout.

### Newly added capability
- One reusable signed, HKD-only summary with monthly payment categories and six-month aggregates.
- Differential render layouts for all 4 system sizes and 3 accessory families, while preserving one `quick` manual-entry link option.
- Signed chart rendering for positive spending and negative refunds.
- Automated simulated Scriptable view-tree tests for every family, `__proto__` input, no-data, FX pending, quick link and non-mutating reads.
- A source-audit CI regression to guard accidental dead-code or mirror divergence.

## D. Repository-wide review boundaries

At the audited main commit, GitHub's recursive repository tree contained **48 tracked files** (source, tests, documentation, assets). A targeted static scan covered the independent runnable JS modules for Expense Tracker, Expense Diagnostics, Bus ETA, standard MTR and adaptive MTR, plus the version and validation utilities. The two Expense Tracker entry paths intentionally mirror the same source and are checked for byte-for-byte equality by the existing CI.

**Static scan observations before this change:**
- The Expense Tracker canonical source was **1,940 lines / 116,517 JavaScript characters**, with approximately **84 named function declarations**. This grew for functional scope, so raw line count alone is not a valid measure of performance or code health.
- No obvious hardcoded credential assignments, `eval()`/dynamic `Function` calls or TODO/FIXME placeholders were detected in the five canonical runtime scripts scanned. This is a regex-based check, **not** a formal security penetration test.
- The Expense runtime's external FX request is to Frankfurter for currency pair/date; Bus and MTR use published transport endpoints. No new network calls were introduced into the Widget branch.
- Bus and MTR app logic was not refactored as part of the Expense Widget redesign. Avoid cross-product churn without proven bugs.

**What was intentionally NOT deleted:** Compatibility mirrors, existing Apple Numbers six-column output, FX retry code, `transaction.previous.json` backups, the Shortcuts diagnostic tool and its provenance, and prior version history. These are maintenance and recovery features, not junk.

## E. Risks and validation gaps

| Priority | Risk | Current status / mitigation |
|---|---|---|
| High | Actual iPhone/iPad widget **visual clipping** / font scaling | Cannot measure without the actual device's Scriptable Widget preview. Mock tests verify API calls and information; use Scriptable “預覽 Widget 尺寸” to inspect all supported sizes. |
| High | Local write is **not atomic** | Existing backup-before-overwrite helps recovery but cannot protect against total device loss or every partial-write failure. Export JSON off-device periodically. No unsafe migration attempted. |
| Medium | iPad Extra Large not offered on iPhone | OS restriction verified; iPad preview only when `Device.isPad()` returns true. |
| Medium | Widget refresh may be delayed | `refreshAfterDate` is earliest preference; Apple WidgetKit owns scheduling. Do not promise a 30-minute service-level interval. |
| Medium | FX unavailable / date invalid | Excluded from HKD chart/total, unresolved count surfaces; original amount/currency retained and retry permitted. |
| Medium | Full ledger grows large | O(N) aggregation but recent sorting O(N log N). If the DB grows to tens of thousands of transactions, consider optional capped index; no speculative cache introduced now. |
| Medium | Cross-device/local sync | Scriptable `FileManager.local()` is intentionally local. Other devices won't automatically share identical ledger history. |
| Low | Numbers rows after manual edits | Original Numbers output is append-based and not automatically reconciled on local edits; unchanged from prior implementation. |

## F. Acceptance evidence & reproducible steps

1. GitHub Actions runs `node --check`, existing Shortcuts/Tap Card/FX mocks, editor/delete/manual tests and `tests/expense-widget-sizes.test.js`. No external network needed for tests.
2. The Widget simulation inspects the real `buildWidget(family)` tree with Scriptable-compatible mocks, including chart outputs and data cards for all sizes.
3. The extra-large view is tested with a simulated iPad screen, without claiming that this is an Apple-native pixel-perfect render.
4. Confirm App → Scriptable → Expense → 「👀 預覽 Widget 尺寸」, on iPhone preview Small/Medium/Large, and on iPad preview Small/Medium/Large/Extra Large.
5. Confirm Wallet Tap Card shortcuts and manual quick link still write to the same file, with no duplication, and the Dashboard matches the Widget monthly HKD totals for the same snapshot.

## G. Conclusions: retained, updated, corrected, new

- **Retained:** Scriptable + local ledger, 4 Widget size code paths, 30-minute *preferred* refresh, 12 Merchant Types including 食飯, custom payment types, Tap Card and manual-entry routes.
- **Updated:** four truly different user-facing information densities, one-pass summary, broader iPad views and bounded recent records.
- **Corrected:** Extra Large is iPad-only; 30-minute refresh is not guaranteed; prototype collision and active zero-net activity are handled; dead helpers removed; prior 100 URL list downgraded to reference bibliography rather than primary evidence.
- **New:** differentiated size regression suite and code-audit gates, six-month iPad trend, payment breakdown by size, refund diagnostics and a clear device-verification checklist.

**Release gate:** merge only after all existing and new CI checks pass; verify the canonical source and intentional legacy mirror are identical. Actual real-device visual QA remains explicitly unverified until a real iPhone/iPad render is inspected.
