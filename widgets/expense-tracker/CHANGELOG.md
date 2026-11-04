# Expense Tracker HK — Version History / 版本紀錄

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
