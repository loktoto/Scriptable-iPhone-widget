# Expense Tracker HK — Version History / 版本紀錄

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
