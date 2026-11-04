# HK Bus ETA — Version History / 版本紀錄

## [2.4.0] — 2026-10-30 (catalogued 2026-11-04)

**Fixed**
- Changed default ETA countdown to a stable snapshot, avoiding iOS timer counting up after an expired arrival estimate.
- Kept a selectable live timer mode, with documented post-ETA limitations.

**Retained**
- KMB/Citybus ETA, official data timestamp, independent favourites, workdays and adaptive refresh requests.

**Source:** [Countdown rollover fix](https://github.com/loktoto/Scriptable-iPhone-widget/commit/ce8ac395d2) · [Initial bus code](https://github.com/loktoto/Scriptable-iPhone-widget/commit/c1c3d00d84)

**Note:** The existing script identifies itself as v2.4. Earlier v1–v2.3 releases were not individually tagged or documented in this Git repository; their historical notes are not invented.
