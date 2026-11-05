# Expense Tracker HK — Version History / 版本紀錄

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
