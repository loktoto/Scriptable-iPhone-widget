# Hong Kong MTR + Bus ETA Widgets — English Setup & Methodology

[Repository home](../README.md) · [廣東話教學](README_zh_HK.md)

## 1. Overview

This repository contains **two separate on-device JavaScript programs for Scriptable on iOS**. The MTR widget shows upcoming trains, destinations and platforms. The bus widget covers KMB and Citybus with up to three ETA predictions, a dynamically rendered timer, and the operator's update timestamp. Neither requires a subscription or API key. API requests still require a network connection.

| MTR screenshot | Bus screenshot |
|---|---|
| ![Cropped MTR widget](images/mtr_widget.png) | ![Cropped Bus widget](images/bus_widget.png) |

All screenshot ETAs are historical samples—not live information.

<a id="mtr"></a>
## 2. MTR: step-by-step installation

1. Install **Scriptable** on iPhone. Create a new script and name it e.g. `MTR Home`.
2. Copy the **entire raw JavaScript** from [`scripts/HK_MTR_Next_Train.js`](../scripts/HK_MTR_Next_Train.js), without wrapping it in JSON or quotes.
3. Run it inside Scriptable. Select a **line → station → direction** (`UP`, `DOWN`, or `BOTH`). Reopen the app to select another station or direction or to use **↻ Refresh**.
4. On your iPhone Home Screen, add a Scriptable widget. Edit its settings and choose `MTR Home` for the **Script** field. Choose the size you prefer (Small is shown in the screenshot).
5. Leave the widget **Parameter** empty to use the saved favourite, or provide `LINE,STATION,DIRECTION` to override it for this particular widget.
6. For independent home/work favourites, duplicate the script and give it a different name (e.g. `MTR Work`). Each name has its own separate settings folder.

### MTR Widget Parameters

| Parameter | Meaning |
|---|---|
| `TWL,TWH,DOWN` | Tsuen Wan Line, Tai Wo Hau, towards Central |
| `TCL,OLY,UP` | Tung Chung Line, Olympic, towards Tung Chung |
| `TKL,TKO,UP` | Tseung Kwan O Line, Tseung Kwan O, towards Po Lam / LOHAS Park |
| `ISL,CAB,BOTH` | Island Line, Causeway Bay, both directions |

`UP`/`DOWN` are **the MTR API's direction codes**, not generic geographic north/south. For branches and short-turn services, the destination on each returned train is authoritative.

<a id="bus"></a>
## 3. Bus: step-by-step installation

1. Create a second Scriptable script named e.g. `Bus Home` and paste [`scripts/HK-Bus-ETA.js`](../scripts/HK-Bus-ETA.js).
2. Run it: select **KMB or Citybus → enter route number → select direction → choose stop**. For example, find route `59M` and select the relevant stop and destination; actual stop choices come from the operator API.
3. In the app's timetable you can add/remove favourites, press **🔄 Refresh**, or configure **⚙ Commute settings**.
4. Add a separate Scriptable Home Screen widget and choose `Bus Home` as the script.
5. The bus **Parameter** may contain a **1-based favourite index** (e.g. `1`) or a **route number** (e.g. `59M`) to show one of your saved favourites. A duplicated route selects the first match: use a numeric index to disambiguate.
6. The bus UI uses Scriptable's `addDate(...).applyTimerStyle()` so the visible countdown can change without fully re-running the widget, but new arrival predictions still require a subsequent API call.

## 4. Adaptive refresh methodology

### MTR adaptive intervals (Hong Kong local time)

The MTR app lets you turn Adaptive Mode on/off, choose individual weekdays, and edit two commute windows. Defaults: **Monday–Friday 07:00–10:00 and 17:30–20:00 HKT**.

| State | Earliest requested widget update | Persistent response cache |
|---|---|---|
| Adaptive OFF | 1 minute | Not reused for normal widget calls |
| Adaptive ON: commute window | 1 minute | Up to current policy interval |
| Adaptive ON: workday outside commute | 5 minutes | Up to current policy interval |
| Adaptive ON: non-workday | 15 minutes | Up to current policy interval |

The MTR script caches fetched **station** JSON in a directory derived from `Script.name()`; different directions reuse the same station feed when still valid. A manual in-app refresh bypasses the normal cache policy. During a short network failure, a recent fallback cache might be shown with a warning. Off-peak mode slows requests; it **never completely disables them**.

### Bus adaptive intervals (Hong Kong local time)

The bus script maintains separate settings, with defaults **Mon–Fri 07:30–09:30 and 18:00–20:00 HKT**, plus a 10-minute pre-commute warm-up period.

| State | Earliest requested widget update |
|---|---|
| Adaptive OFF | 1 minute |
| Adaptive ON: commute / warm-up | 1 minute |
| Adaptive ON: workday daytime (07:00–20:00), otherwise | 30 minutes |
| Adaptive ON: night or non-workday | 60 minutes |
| Scriptable foreground table while open | Re-query approximately every 30 seconds |

Unlike MTR, this version of the bus script **does not persist ETA API responses** as a cross-run cache. Adaptive mode mainly requests a different next iOS widget run time. Route/stop lookup metadata has separate daily caching. On each widget execution, the bus script fetches ETA again.

### Important: requested time is not a timer guarantee

The value assigned to `ListWidget.refreshAfterDate` is the **earliest allowed refresh time**, not a guarantee of execution. iOS controls the actual scheduling and may delay refreshes for power and background budget reasons. Tapping `↻` opens Scriptable (where the request can be performed); it is not an in-place refresh action embedded in a Small Widget. Do not assume the MTR's displayed numeric minutes continuously decrease between executions; the bus timer date style has different rendering behaviour.

## 5. Technical data flow and validation

### MTR processing pipeline

1. Resolve a valid `{line, station, direction}` from URL/widget parameters or the saved local favourite.
2. Compute the current weekday and time in **Hong Kong UTC+8**, regardless of device time zone, and determine the policy interval.
3. For a widget invocation, try fresh-enough per-station JSON cache. Otherwise query `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=...&sta=...&lang=TC`.
4. Parse `data["LINE-STATION"].UP` and `.DOWN`, using scheduled `time`, `dest`, and `plat`. Convert the API's naïve Hong Kong time strings to an absolute timestamp, calculate minute differences against `Date.now()`, sort and discard expired trains.
5. Render a full-width arrival panel plus additional trains, display the original provider update time, and show low-frequency/fallback notices where applicable.
6. Request the next widget opportunity through `refreshAfterDate`; iOS decides the real invocation time.

### Bus processing pipeline

1. Fetch operator route/stop information after user route selection; save operator, route, direction, stop, sequence and service type to a per-script `favorites.json`.
2. Call KMB or Citybus's stop ETA endpoint; match route/direction/stop sequence, sort valid future predictions, and keep up to three arrivals.
3. Convert ISO ETA timestamps to absolute dates; provide visible estimated arrival time in HKT plus an iOS-native countdown date display.
4. Display `data_timestamp` or `generated_timestamp` where available, warning on predictions whose provider timestamp is stale.
5. Use foreground polling while the app's table is open; for Home Screen widgets, request a next run according to Adaptive Mode.

### Feed refresh vs widget refresh

- The **MTR published feed** is updated roughly every **10 seconds** and can provide up to four next trains per direction.
- **KMB and Citybus ETA feeds** update approximately every **minute**.
- Neither feed's update cadence forces iOS to rerun Scriptable. In long low-frequency windows, an arrival estimate may be too old to rely on for a tight transfer; always manually refresh close to departure.

## 6. Per-script data isolation, privacy, and migration

- MTR: `<Scriptable local Library>/HKMTR_EdgeToEdge/<encoded Script.name>/favourite.json`; separate `adaptive.json` and per-station JSON caches in the same folder.
- Bus: `<Scriptable local Documents>/HKBusETA/<sanitized Script.name>/favorites.json`, plus `settings.json`. Bus global stop-name caches are shared **only as reference metadata**, not as private preferences.
- Bus version 2.3 performs a **one-time copy** of an old shared `HKBusETA/favorites.json` into a newly named script's folder if that folder has no favourites; after this copy, the files are independent. If you want a truly clean setup, make sure no legacy shared file is present.
- No API keys, locally saved favourites, individual travel history, location coordinates or full phone screenshots have been committed. Only cropped display screenshots (provided for publication), JavaScript, and documentation are checked in.
- There is no self-hosted telemetry endpoint or external API key dependency. Operator/government API requests still transmit network requests to those providers.

## 7. Troubleshooting and testing

**`SyntaxError: Unexpected token ':'` on line 1** — Most likely pasted a JSON object with a `"code"` field, rather than the raw `.js` script. The source file starts with JavaScript comments.

**Two widgets show the same favourite** — They likely use the same Script name and no widget parameter. Assign different Script names or use MTR's per-widget parameter. Bus and MTR files have different directories; they do not share one `favourite.json`.

**Train or bus ETA appears stale** — iOS may be delaying widget executions, or the script may be in an intentional low-frequency window. Open Scriptable, press refresh, and check the provider update timestamp and warnings.

**Different font sizes from screenshots** — iPhone size, display zoom, text scaling, Scriptable versions and widget family can affect layout. The screenshots are examples, not pixel-perfect universal templates.

**Static JavaScript syntax checks (no iPhone needed)**:

```bash
node --check scripts/HK_MTR_Next_Train.js
node --check scripts/HK-Bus-ETA.js
```

These validate parsing only. Real API behaviour, iOS countdown rendering, URL interactions, and layout require Scriptable on a device. This repository does not claim a complete device-level E2E test.

## 8. Official references

- [MTR real-time next trains](https://data.gov.hk/en-data/dataset/mtr-data2-nexttrain-data)
- [MTR Next Train API specification](https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.3.pdf)
- [KMB/LWB public ETA data](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb)
- [Citybus public ETA data](https://data.gov.hk/en-data/dataset/ctb-eta-transport-realtime-eta)
- [Scriptable ListWidget documentation](https://docs.scriptable.app/listwidget/)
