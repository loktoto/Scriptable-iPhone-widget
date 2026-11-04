# Legacy Script Links / 舊連結兼容

Original `scripts/` paths are retained as **byte-for-byte mirrors** for users who bookmarked previous documentation. Use [widgets/](../widgets/) as the canonical source for new installations and version history.

| Legacy | Canonical |
|---|---|
| [HK-Bus-ETA.js](HK-Bus-ETA.js) | [widgets/bus-eta/HK-Bus-ETA.js](../widgets/bus-eta/HK-Bus-ETA.js) |
| [HK-MTR-Next-Train.js](HK-MTR-Next-Train.js) | [widgets/mtr-next-train/standard/HK-MTR-Next-Train.js](../widgets/mtr-next-train/standard/HK-MTR-Next-Train.js) |
| [HK_MTR_Next_Train.js](HK_MTR_Next_Train.js) | [widgets/mtr-next-train/adaptive/HK_MTR_Next_Train.js](../widgets/mtr-next-train/adaptive/HK_MTR_Next_Train.js) |
| [HK-Expense-Tracker.js](HK-Expense-Tracker.js) | [widgets/expense-tracker/HK-Expense-Tracker.js](../widgets/expense-tracker/HK-Expense-Tracker.js) |
| [HK-Expense-Input-Diagnostic.js](HK-Expense-Input-Diagnostic.js) | [widgets/expense-tracker/HK-Expense-Input-Diagnostic.js](../widgets/expense-tracker/HK-Expense-Input-Diagnostic.js) |

For every future source change, update both copies and the associated `VERSION.json` + `CHANGELOG.md`. Automated checks prevent drift.
