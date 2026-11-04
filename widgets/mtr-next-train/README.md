# HK MTR Next Train | 港鐵 Widget

Two independent standalone implementations in one widget family:

| Edition | Source | Notes |
|---|---|---|
| **Standard** | [standard/HK-MTR-Next-Train.js](standard/HK-MTR-Next-Train.js) | Public implementation, selectable line / station / direction and adaptive refresh |
| **Adaptive** | [adaptive/HK_MTR_Next_Train.js](adaptive/HK_MTR_Next_Train.js) | Separate original implementation, configurable workdays and low-frequency requests |

These are different implementations, **not a version-upgrade path between two files**. Select one and paste the whole script into Scriptable. Their on-device favourites/settings remain separate.

**Family version:** [1.0.0](VERSION.json) · [Changelog](CHANGELOG.md). Changing either edition requires bumping the family version and describing which edition changed.

Source: MTR official public Next Train API. iOS controls actual widget refresh.

Documentation: [廣東話](../../docs/README_zh_HK.md) · [English](../../docs/README_en.md).
