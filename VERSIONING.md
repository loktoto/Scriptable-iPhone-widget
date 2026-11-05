# Per-widget Versioning / 每個 Widget 獨立版本管理

**Effective:** 2026-11-04. Git commits contain the underlying immutable history; independent widget versions are catalogued in `widgets/<name>/VERSION.json`.

| Widget | Current baseline | Changelog |
|---|---|---|
| [Bus ETA](widgets/bus-eta/) | 2.4.0 | [CHANGELOG](widgets/bus-eta/CHANGELOG.md) |
| [MTR Next Train](widgets/mtr-next-train/) | 1.0.0 | [CHANGELOG](widgets/mtr-next-train/CHANGELOG.md) |
| [Expense Tracker](widgets/expense-tracker/) | 3.11.1 | [CHANGELOG](widgets/expense-tracker/CHANGELOG.md) |

## Mandatory release workflow / 往後每次修改

1. Edit the canonical file under **`widgets/<widget>/`**. Each widget has an independently managed **MAJOR.MINOR.PATCH** version. MTR Standard and Adaptive share one family version.
2. Bump **only** that widget's `VERSION.json`: **PATCH** bug fix; **MINOR** backward-compatible new functionality; **MAJOR** breaking change or migration.
3. Add a new dated **`## [X.Y.Z] — YYYY-MM-DD`** section to that widget's `CHANGELOG.md`, with Added / Changed / Fixed / Removed, user impact, any migration instructions, and honest test status. Do not invent historical releases.
4. Update the corresponding compatibility source in `scripts/` **byte-for-byte**. Old links will continue working. Both are standalone iPhone Scriptable programs.
5. Run `node tests/validate.js` and `node tools/check-widget-versions.js`. GitHub Actions runs these on each push/PR. The version checker fails if a widget source changes **without a higher version and a changed changelog**.
6. Commit with a focused message, e.g. `fix(expense-tracker): address duplicate handling (v3.7.1)`.
7. Manually paste the new script into the corresponding iPhone Scriptable app. **GitHub updates do not deploy to iOS**.

Documentation-only modifications do not require a bump.

## Folder layout

```text
widgets/
  bus-eta/{HK-Bus-ETA.js,VERSION.json,CHANGELOG.md,README.md}
  mtr-next-train/
    standard/HK-MTR-Next-Train.js
    adaptive/HK_MTR_Next_Train.js
    VERSION.json, CHANGELOG.md, README.md
  expense-tracker/
    HK-Expense-Tracker.js
    HK-Expense-Input-Diagnostic.js
    VERSION.json, CHANGELOG.md, README.md
scripts/                  # Backward-compatible mirrors
tests/                    # Offline checks
tools/check-widget-versions.js
```

## Privacy

This is a **public repo**. Never commit actual `transactions.json`, CSV exports, real card data, personal commute preferences or credentials. Keep transactions in local Scriptable storage.
