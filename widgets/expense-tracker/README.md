# Expense Tracker HK | 記帳 Widget

**Main:** [HK-Expense-Tracker.js](HK-Expense-Tracker.js)  
**Read-only diagnostic:** [HK-Expense-Input-Diagnostic.js](HK-Expense-Input-Diagnostic.js)  
**Current version:** [3.7.0](VERSION.json) · [Release notes](CHANGELOG.md)

- Apple Intelligence / Shortcuts Dictionary, nested `amount.content`, regular JSON, constrained key-based text extraction.
- Save valid nonzero amounts only. Negative transactions are refunds; other missing fields may still be saved.
- After saving, re-open `transactions.json` to verify persistence and return a marked `[EXPENSE-HK-v3.7]` receipt.
- Adaptive Small / Medium / Large / iPad Extra Large widgets, category charts, recent transactions, optional FX reference conversion, CSV and JSON export.
- Local Scriptable data only. **Never publish your real transaction CSV, JSON, card information or AI text to this public repo.**

[Installation / 安裝](../../docs/EXPENSE_TRACKER.md) · [Synthetic example JSON](../../examples/expense-transaction.example.json)

A GitHub update never changes an already installed iPhone Scriptable script; reinstall the updated source manually after each release.
