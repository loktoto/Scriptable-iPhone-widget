# Expense Tracker HK — Version History / 版本紀錄

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
