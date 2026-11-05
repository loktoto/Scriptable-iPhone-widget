# Expense Tracker HK | 記帳 Widget

**Main:** [HK-Expense-Tracker.js](HK-Expense-Tracker.js)  
**Read-only diagnostic:** [HK-Expense-Input-Diagnostic.js](HK-Expense-Input-Diagnostic.js)  
**Current version:** [3.11.2](VERSION.json) · [Release notes](CHANGELOG.md)

- Apple Intelligence / Shortcuts Dictionary, nested `amount.content`, regular JSON, constrained key-based text extraction.
- Save valid nonzero amounts only. Negative transactions are refunds; other missing fields may still be saved.
- After saving, re-open `transactions.json` to verify persistence and return a marked `[EXPENSE-HK-v3.11.2]` receipt.
- Adaptive Small / Medium / Large / iPad Extra Large widgets, category charts, recent transactions, optional FX reference conversion, CSV and JSON export.
- Local Scriptable data only. **Never publish your real transaction CSV, JSON, card information or AI text to this public repo.**

[Installation / 安裝](../../docs/EXPENSE_TRACKER.md) · [Synthetic example JSON](../../examples/expense-transaction.example.json)

A GitHub update never changes an already installed iPhone Scriptable script; reinstall the updated source manually after each release.

**Shortcuts reliability (v3.7.1):** Imports save and verify without waiting for historical FX requests. Pending foreign currency can be converted with **Retry FX** in the Scriptable app.

**Apple Numbers bridge v3.11.2:** Run Expense returns a Dictionary. Shortcuts must then use `shouldAppendNumbers` and `numbersRow` to append one row to a chosen Numbers Table. See [Numbers setup](../../docs/EXPENSE_TRACKER.md#apple-numbers-data-table--apple-numbers-表格寫入-v380).

**Execution audit (v3.11.2):** Open this installed script in Scriptable → 🧪 查看 Shortcuts 記帳紀錄. Local, private `ExpenseTrackerHK/last-shortcut-run.json` shows whether the Shortcut was invoked and how far it reached.

## Edit Dashboard transactions (v3.11.2)
Open the Dashboard and use the Edit control on any row, or choose the Scriptable app-menu Edit Transaction fallback. The editor validates amount and date, retains the transaction ID, saves back to local JSON and refreshes Dashboard. **Existing Apple Numbers rows are not updated.**

### Swipe left to delete (v3.11.2)
Dashboard transaction cards support swipe-left → red Delete button → native confirmation, swipe-right to close, plus a ⋯ button and in-app deletion fallback. Local JSON is backed up and read-back verified; Apple Numbers and older backup copies are not altered.

### Visual manual expense entry (v3.11.2)
Choose **➕ 手動記帳** in Scriptable or **＋ 手動記帳** in the Dashboard to enter cash, Octopus, FPS and bank-transfer transactions using a dark 3-column icon category grid, day navigation, amount, time, payment source and currency. Saves to the existing local JSON ledger, with nonzero validation, FX pending state, duplicate prevention and disk verification. Manual entries are **not** added to Apple Numbers automatically.

### v3.11.2 — App entry point hotfix
Dashboard and Manual Entry now both work through the same `presentExpenseWeb` controller. v3.11.0 was missing their required wrapper functions and could crash with `Can't find variable: dashboard`. Existing local transaction files are unaffected. Full Scriptable app-route regression tests now run in CI.

### Manual form compact layout — v3.11.2
The mobile manual form now reserves space for iOS native WebView chrome, shows only one date field, uses tighter category cards, reduces the sticky Save bar and keeps time/payment controls separated. No input or storage schema migration is required.
