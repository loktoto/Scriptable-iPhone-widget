// HK MTR Next Train - Adaptive Low-Frequency Edition
// Adaptive ON: commute 1m, workday off-peak 5m, non-workday 15m. Never pauses.
// Adaptive OFF: 1m requested; manual in-app refresh always makes a fresh call.
// iOS ultimately determines actual widget update frequency.
// Copy the raw JavaScript (not JSON) into a uniquely named Scriptable script.
// Each script name receives a separate favourite.json under FileManager.libraryDirectory().
// Widget Parameter examples: TCL,OLY,UP | TKL,TKO,DOWN | ISL,CAB,BOTH
// Data source: https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php

const LINES = {
  AEL: { name: '機場快綫', color: '#00A0A8', up: '機場／博覽館', down: '香港', stations: 'HOK:香港|KOW:九龍|TSY:青衣|AIR:機場|AWE:博覽館' },
  TCL: { name: '東涌綫', color: '#FFAD3D', up: '東涌', down: '香港', stations: 'HOK:香港|KOW:九龍|OLY:奧運|NAC:南昌|LAK:荔景|TSY:青衣|SUN:欣澳|TUC:東涌' },
  TML: { name: '屯馬綫', color: '#BB6AB1', up: '屯門', down: '烏溪沙', stations: 'WKS:烏溪沙|MOS:馬鞍山|HEO:恆安|TSH:大水坑|SHM:石門|CIO:第一城|STW:沙田圍|CKT:車公廟|TAW:大圍|HIK:顯徑|DIH:鑽石山|KAT:啟德|SUW:宋皇臺|TKW:土瓜灣|HOM:何文田|HUH:紅磡|ETS:尖東|AUS:柯士甸|NAC:南昌|MEF:美孚|TWW:荃灣西|KSR:錦上路|YUL:元朗|LOP:朗屏|TIS:天水圍|SIH:兆康|TUM:屯門' },
  TKL: { name: '將軍澳綫', color: '#9CD66A', up: '寶琳／康城', down: '北角／調景嶺', stations: 'NOP:北角|QUB:鰂魚涌|YAT:油塘|TIK:調景嶺|TKO:將軍澳|LHP:康城|HAH:坑口|POA:寶琳' },
  EAL: { name: '東鐵綫', color: '#6ACCC7', up: '羅湖／落馬洲', down: '金鐘', stations: 'ADM:金鐘|EXC:會展|HUH:紅磡|MKK:旺角東|KOT:九龍塘|TAW:大圍|SHT:沙田|FOT:火炭|RAC:馬場|UNI:大學|TAP:大埔墟|TWO:太和|FAN:粉嶺|SHS:上水|LOW:羅湖|LMC:落馬洲' },
  SIL: { name: '南港島綫', color: '#C7DC59', up: '海怡半島', down: '金鐘', stations: 'ADM:金鐘|OCP:海洋公園|WCH:黃竹坑|LET:利東|SOH:海怡半島' },
  TWL: { name: '荃灣綫', color: '#FF6969', up: '荃灣', down: '中環', stations: 'CEN:中環|ADM:金鐘|TST:尖沙咀|JOR:佐敦|YMT:油麻地|MOK:旺角|PRE:太子|SSP:深水埗|CSW:長沙灣|LCK:荔枝角|MEF:美孚|LAK:荔景|KWF:葵芳|KWH:葵興|TWH:大窩口|TSW:荃灣' },
  ISL: { name: '港島綫', color: '#59ABFF', up: '柴灣', down: '堅尼地城', stations: 'KET:堅尼地城|HKU:香港大學|SYP:西營盤|SHW:上環|CEN:中環|ADM:金鐘|WAC:灣仔|CAB:銅鑼灣|TIH:天后|FOH:炮台山|NOP:北角|QUB:鰂魚涌|TAK:太古|SWH:西灣河|SKW:筲箕灣|HFC:杏花邨|CHW:柴灣' },
  KTL: { name: '觀塘綫', color: '#4FCD90', up: '調景嶺', down: '黃埔', stations: 'WHA:黃埔|HOM:何文田|YMT:油麻地|MOK:旺角|PRE:太子|SKM:石硤尾|KOT:九龍塘|LOF:樂富|WTS:黃大仙|DIH:鑽石山|CHH:彩虹|KOB:九龍灣|NTK:牛頭角|KWT:觀塘|LAT:藍田|YAT:油塘|TIK:調景嶺' },
  DRL: { name: '迪士尼綫', color: '#D9A5DB', up: '欣澳', down: '迪士尼', stations: 'SUN:欣澳|DIS:迪士尼' }
};

const STATIONS = {};
for (const code of Object.keys(LINES)) {
  LINES[code].list = LINES[code].stations.split('|').map(item => {
    const pair = item.split(':');
    STATIONS[pair[0]] = pair[1];
    return { code: pair[0], name: pair[1] };
  });
}

// Each Scriptable script has its OWN settings directory.
// Example: .../HKMTR_EdgeToEdge/MTR_A/favourite.json
//          .../HKMTR_EdgeToEdge/MTR_B/favourite.json
// Never read or write shared favourites or older global HKMTR settings.
const F = FileManager.local();
const SCRIPT_NAME = Script.name();
const SCRIPT_KEY = encodeURIComponent(SCRIPT_NAME);
const SETTINGS_ROOT = F.joinPath(F.libraryDirectory(), 'HKMTR_EdgeToEdge');
const SETTINGS_DIR = F.joinPath(SETTINGS_ROOT, SCRIPT_KEY);
F.createDirectory(SETTINGS_DIR, true);
const SAVE_FILE = F.joinPath(SETTINGS_DIR, 'favourite.json');
const DEFAULT = { line: 'TCL', station: 'OLY', direction: 'UP' };
const ADAPTIVE_FILE = F.joinPath(SETTINGS_DIR, 'adaptive.json');
// Cache keyed by LINE/STATION so opposite-direction widgets share one response.
// Different Script names never share settings or cache files.
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const ADAPTIVE_DEFAULT = {
  enabled: true,
  workdays: [1, 2, 3, 4, 5],
  windows: [['07:00', '10:00'], ['17:30', '20:00']]
};
// Desired cadence and minimum API-fetch interval when caching in widgets.
// These are requests / throttles, NOT guaranteed iOS widget refresh intervals.
const INTERVAL_COMMUTE_MS = 60 * 1000;
const INTERVAL_OFFPEAK_MS = 5 * 60 * 1000;
const INTERVAL_NONWORK_MS = 15 * 60 * 1000;
const CACHE_MAX_AGE_MS = INTERVAL_NONWORK_MS;
const FALLBACK_MAX_AGE_MS = 90 * 1000;

function cloneDefaultAdaptive() {
  return JSON.parse(JSON.stringify(ADAPTIVE_DEFAULT));
}
function validTime(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
function timeMinutes(s) {
  return Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
}
function readAdaptive() {
  const d = cloneDefaultAdaptive();
  try {
    if (!F.fileExists(ADAPTIVE_FILE)) return d;
    const x = JSON.parse(F.readString(ADAPTIVE_FILE));
    if (typeof x.enabled === 'boolean') d.enabled = x.enabled;
    if (Array.isArray(x.workdays)) {
      d.workdays = [...new Set(x.workdays.filter(n => Number.isInteger(n) && n >= 0 && n <= 6))];
    }
    if (Array.isArray(x.windows) && x.windows.length === 2 &&
        x.windows.every(w => Array.isArray(w) && w.length === 2 &&
          w.every(validTime) && timeMinutes(w[0]) < timeMinutes(w[1]))) {
      d.windows = x.windows;
    }
  } catch (_) {}
  return d;
}
function saveAdaptive(d) {
  F.writeString(ADAPTIVE_FILE, JSON.stringify(d));
}

// HKT is UTC+8, independently of the iPhone's current timezone.
function hkNow(now = Date.now()) {
  const d = new Date(now + 8 * 3600000);
  return {
    weekday: d.getUTCDay(),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate()
  };
}
// Return a reduced update frequency OUTSIDE commute; never pause outright.
// When a commuting window is about to begin, schedule a wake-up at its boundary.
function refreshPolicy(settings, now = Date.now()) {
  if (!settings.enabled) return {
    intervalMs: INTERVAL_COMMUTE_MS, label: '標準 1分', nextBoundary: Infinity
  };

  const h = hkNow(now);
  const workday = settings.workdays.includes(h.weekday);
  const commuting = workday && settings.windows.some(
    w => h.minutes >= timeMinutes(w[0]) && h.minutes < timeMinutes(w[1])
  );
  const intervalMs = commuting ? INTERVAL_COMMUTE_MS
    : workday ? INTERVAL_OFFPEAK_MS : INTERVAL_NONWORK_MS;
  const label = commuting ? '通勤 1分' : workday ? '平日低頻 5分' : '非工作日 15分';

  const midnight = Date.UTC(h.year, h.month, h.date) - 8 * 3600000;
  let nextBoundary = Infinity;
  for (let d = 0; d <= 7; d++) {
    const weekday = (h.weekday + d) % 7;
    if (!settings.workdays.includes(weekday)) continue;
    for (const w of settings.windows) {
      for (const t of w) {
        const when = midnight + d * 86400000 + timeMinutes(t) * 60000;
        if (when > now && when < nextBoundary) nextBoundary = when;
      }
    }
  }
  return { intervalMs, label, nextBoundary };
}

function formatHKT(ms) {
  const d = new Date(ms + 8 * 3600000);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const hm = [d.getUTCHours(), d.getUTCMinutes()].map(x => String(x).padStart(2, '0')).join(':');
  return '星期' + weekday + ' ' + hm;
}
function cacheFile(c) {
  return F.joinPath(SETTINGS_DIR, 'cache_' + c.line + '_' + c.station + '.json');
}
function readCache(c) {
  try {
    const p = cacheFile(c);
    if (!F.fileExists(p)) return null;
    const d = JSON.parse(F.readString(p));
    if (!d || !Number.isFinite(d.fetchedAt) || !d.json || !d.json.data ||
        !d.json.data[c.line + '-' + c.station]) return null;
    const age = Date.now() - d.fetchedAt;
    if (age < 0 || age > CACHE_MAX_AGE_MS) return null;
    return { json: d.json, age, fetchedAt: d.fetchedAt };
  } catch (_) { return null; }
}
function saveCache(c, json) {
  try { F.writeString(cacheFile(c), JSON.stringify({ fetchedAt: Date.now(), json })); }
  catch (_) {} // A failed cache write must never stop an API result.
}

async function chooseWorkdays(adaptive) {
  while (true) {
    const a = new Alert();
    a.title = '選擇工作日（香港時間）';
    a.message = '逐日點選切換 ✓，最後按「完成」';
    WEEKDAYS.forEach((x, i) => a.addAction((adaptive.workdays.includes(i) ? '✓ ' : '○ ') + '星期' + x));
    a.addAction('完成');
    a.addCancelAction('返回');
    const i = await a.presentSheet();
    if (i < 0 || i === 7) break;
    if (adaptive.workdays.includes(i)) adaptive.workdays = adaptive.workdays.filter(n => n !== i);
    else adaptive.workdays.push(i);
    adaptive.workdays.sort((a, b) => a - b);
    saveAdaptive(adaptive);
  }
}
async function editWindows(adaptive) {
  const a = new Alert();
  a.title = '設定通勤時間（香港時間）';
  a.message = '24 小時制 HH:MM；每個時段開始必須早於結束。';
  a.addTextField('早上開始', adaptive.windows[0][0]);
  a.addTextField('早上結束', adaptive.windows[0][1]);
  a.addTextField('傍晚開始', adaptive.windows[1][0]);
  a.addTextField('傍晚結束', adaptive.windows[1][1]);
  a.addAction('儲存');
  a.addCancelAction('取消');
  if (await a.presentAlert() < 0) return;
  const v = [0, 1, 2, 3].map(i => a.textFieldValue(i).trim());
  if (!v.every(validTime) || timeMinutes(v[0]) >= timeMinutes(v[1]) ||
      timeMinutes(v[2]) >= timeMinutes(v[3])) {
    const msg = new Alert();
    msg.title = '時間格式不正確';
    msg.message = '請輸入例如 07:30／09:30，並確保開始早於結束。';
    msg.addAction('確定');
    await msg.presentAlert();
    return;
  }
  adaptive.windows = [[v[0], v[1]], [v[2], v[3]]];
  saveAdaptive(adaptive);
}


function normalizeChoice(c) {
  if (!c) return null;
  const line = String(c.line || '').trim().toUpperCase();
  const station = String(c.station || '').trim().toUpperCase();
  const direction = String(c.direction || 'BOTH').trim().toUpperCase();
  if (!LINES[line] || !LINES[line].list.some(x => x.code === station)) return null;
  if (!['UP', 'DOWN', 'BOTH'].includes(direction)) return null;
  return { line, station, direction };
}
function getSaved() {
  try {
    if (!F.fileExists(SAVE_FILE)) return null;
    return normalizeChoice(JSON.parse(F.readString(SAVE_FILE)));
  } catch (_) {
    return null;
  }
}
function setSaved(c) {
  const selection = normalizeChoice(c);
  if (!selection) return;
  F.writeString(SAVE_FILE, JSON.stringify(selection));
}
function directionLabel(line, dir) {
  if (dir === 'BOTH') return '兩個方向';
  return '往' + (dir === 'UP' ? LINES[line].up : LINES[line].down);
}
function argsChoice() {
  const p = args.queryParameters || {};
  const urlChoice = normalizeChoice({ line: p.line, station: p.station, direction: p.direction || p.dir });
  if (urlChoice) return urlChoice;
  const tokens = String(args.widgetParameter || '').toUpperCase().trim().split(/[,/:]/).map(x => x.trim());
  if (![2, 3].includes(tokens.length)) return null;
  return normalizeChoice({ line: tokens[0], station: tokens[1], direction: tokens[2] || 'BOTH' });
}
function launchURL(c) {
  const base = URLScheme.forRunningScript();
  return base + (base.includes('?') ? '&' : '?') + 'line=' + c.line + '&station=' + c.station + '&direction=' + c.direction + '&force=1';
}
async function chooseDirection(line, active) {
  const choices = ['BOTH', 'UP', 'DOWN'];
  const a = new Alert();
  a.title = '選擇方向';
  a.message = LINES[line].name;
  choices.forEach(x => a.addAction((x === active ? '✓ ' : '') + directionLabel(line, x)));
  a.addCancelAction('取消');
  const i = await a.presentSheet();
  return i < 0 ? null : choices[i];
}
async function chooseStation() {
  const lines = Object.keys(LINES);
  const a = new Alert();
  a.title = '選擇港鐵路線';
  lines.forEach(x => a.addAction(LINES[x].name));
  a.addCancelAction('取消');
  const li = await a.presentSheet();
  if (li < 0) return null;
  const line = lines[li];
  const b = new Alert();
  b.title = '選擇車站 · ' + LINES[line].name;
  LINES[line].list.forEach(x => b.addAction(x.name));
  b.addCancelAction('取消');
  const si = await b.presentSheet();
  if (si < 0) return null;
  const direction = await chooseDirection(line, 'BOTH');
  if (!direction) return null;
  const result = { line, station: LINES[line].list[si].code, direction };
  setSaved(result);
  return result;
}

// MTR timestamps use Hong Kong time, not the phone's local timezone.
function asHKT(value) {
  const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)$/.exec(String(value || ''));
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - 8 * 3600000;
}
function mins(value) {
  const sec = (asHKT(value) - Date.now()) / 1000;
  return !Number.isFinite(sec) || sec < -45 ? null : Math.max(0, Math.ceil(sec / 60));
}
function etaLabel(t) {
  if (t.minutes === null) return '--';
  return t.minutes === 0 ? '即將到站' : t.minutes + ' 分鐘';
}
function clock(value) { return String(value || '').slice(11, 16); }
function platform(t) { return t.plat ? String(t.plat) + '號月台' : '月台待定'; }
function parseResponse(c, json, source) {
  if (Number(json.status) === 0) throw new Error(json.message || '港鐵服務資料暫不可用');
  const data = json.data && json.data[c.line + '-' + c.station];
  if (!data) throw new Error('此站暫時沒有即時資料');
  const dirs = c.direction === 'BOTH' ? ['UP', 'DOWN'] : [c.direction];
  const groups = dirs.map(dir => ({
    dir,
    trains: (Array.isArray(data[dir]) ? data[dir] : [])
      .filter(t => String(t.valid || 'Y').toUpperCase() !== 'N')
      .map(t => Object.assign({}, t, { minutes: mins(t.time) }))
      .filter(t => t.minutes !== null)
      .sort((a, b) => asHKT(a.time) - asHKT(b.time))
  }));
  return {
    groups,
    updated: data.curr_time || json.curr_time || '',
    delayed: String(json.Isdelay || json.isdelay || '').toUpperCase() === 'Y',
    source
  };
}
async function getTrains(c, opts = {}) {
  const adaptive = opts.adaptive || readAdaptive();
  const isWidget = !!opts.isWidget;
  const force = !!opts.force;
  const policy = refreshPolicy(adaptive);
  const cached = readCache(c);

  // Reduce duplicate API calls, including widgets for opposite directions at
  // the same station. Manual in-app refresh ALWAYS bypasses the cache.
  if (isWidget && adaptive.enabled && !force && cached &&
      cached.age < policy.intervalMs) {
    try {
      const info = parseResponse(c, cached.json, '快取');
      info.cacheAgeMs = cached.age;
      info.fetchedAt = cached.fetchedAt;
      return info;
    } catch (_) { /* Cache invalid; fetch fresh. */ }
  }

  const url = 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php'
    + '?line=' + c.line + '&sta=' + c.station + '&lang=TC';
  try {
    const r = new Request(url);
    r.timeoutInterval = 15;
    const json = await r.loadJSON();
    if (r.response && r.response.statusCode !== 200) {
      throw new Error('HTTP ' + r.response.statusCode);
    }
    const info = parseResponse(c, json, '即時');
    info.fetchedAt = Date.now();
    info.cacheAgeMs = 0;
    saveCache(c, json);
    return info;
  } catch (e) {
    // Only very recent cache may be used as a network-error fallback.
    if (cached && cached.age <= FALLBACK_MAX_AGE_MS) {
      const info = parseResponse(c, cached.json, '短暫快取（網絡錯誤）');
      info.fetchedAt = cached.fetchedAt;
      info.cacheAgeMs = cached.age;
      info.cacheWarning = true;
      return info;
    }
    throw e;
  }
}

const C = {
  bg: '#122331', panel: '#1D3545', white: '#FFFFFF', dim: '#A8BFCD', muted: '#8FA5B5', blue: '#85D7FF'
};
function label(holder, s, size, color, bold) {
  const t = holder.addText(String(s));
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color || C.white);
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.65;
  return t;
}
// Larger route / station / direction labels without wasting width.
// On a small widget, long directions receive their own row.
function header(w, c, small) {
  const family = config.widgetFamily || 'small';
  const medium = family === 'medium';
  const title = w.addStack();
  title.layoutHorizontally();
  title.centerAlignContent();

  label(title, '🚇 ' + STATIONS[c.station],
        small ? 21 : (medium ? 23 : 26), C.white, true);
  title.addSpacer();
  const refresh = label(title, '↻', small ? 22 : 25, C.blue, true);
  if (!small) refresh.url = launchURL(c);

  const lineName = LINES[c.line].name;
  const direction = directionLabel(c.line, c.direction);
  const longHeader = small &&
    (Array.from(lineName).length + Array.from(direction).length >= 10);

  w.addSpacer(1);
  if (longHeader) {
    // Keep full readable wording for long route directions.
    label(w, lineName, 14, LINES[c.line].color, true);
    label(w, direction, 15, C.white, true);
  } else {
    const meta = w.addStack();
    meta.layoutHorizontally();
    meta.centerAlignContent();
    label(meta, lineName, small ? 14 : (medium ? 16 : 18),
          LINES[c.line].color, true);
    meta.addSpacer(small ? 4 : 10);
    label(meta, direction, small ? 15 : (medium ? 17 : 19),
          C.white, true);
  }
  return longHeader;
}
// Full-width horizontal arrival card. A flexible horizontal spacer is
// deliberately inside the coloured card to stretch its background to the
// available widget width; a vertical card would shrink-wrap the text.
function arrivalCard(holder, t, accent, family, count) {
  const small = family === 'small';
  const large = family === 'large' || family === 'extraLarge';
  const height = small
    ? (count === 1 ? 77 : count === 2 ? 61 : 55)
    : large ? (count <= 2 ? 145 : 116)
    : (count === 1 ? 87 : count === 2 ? 75 : 57);

  const card = holder.addStack();
  card.layoutHorizontally();
  card.centerAlignContent();
  card.backgroundColor = new Color(C.panel);
  card.cornerRadius = small ? 11 : 15;
  card.size = new Size(0, height); // width: automatic, height: responsive
  card.setPadding(small ? 5 : (large ? 12 : 5), small ? 9 : 14,
                  small ? 5 : (large ? 12 : 5), small ? 9 : 14);

  const left = card.addStack();
  left.layoutVertically();
  label(left, '下一班 · 往' + (STATIONS[t.dest] || t.dest || '未知'),
        small ? 10 : (large ? 12 : 9), accent, true);
  left.addSpacer(small ? 1 : 5);

  const eta = left.addStack();
  eta.centerAlignContent();
  if (t.minutes === 0) {
    label(eta, '即將到站', small ? 23 : 33, C.white, true);
  } else {
    label(eta, String(t.minutes), small ? 32 : (large ? 60 : 34), C.white, true);
    eta.addSpacer(3);
    label(eta, '分鐘', small ? 12 : (large ? 16 : 12), C.white, true);
  }

  // This expands the ENTIRE coloured card, not just the countdown text.
  card.addSpacer();

  const right = card.addStack();
  right.layoutVertically();
  right.centerAlignContent();
  label(right, platform(t), small ? 9 : 12, C.dim, false);
  right.addSpacer(small ? 3 : 9);
  label(right, clock(t.time), small ? 12 : 17, C.white, true);
}

// A complete horizontally stretched row for each later train.
function nextRow(holder, t, index, accent, small) {
  const row = holder.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  const medium = config.widgetFamily === 'medium';
  row.size = new Size(0, small ? 17 : (medium ? 22 : 25));
  label(row, (index + 1) + '班 · 往' + (STATIONS[t.dest] || t.dest || '未知'),
        small ? 11 : (medium ? 12 : 13), C.dim, false);
  row.addSpacer();
  label(row, etaLabel(t), small || medium ? 14 : 17, C.white, true);
}

function directionMiniCard(holder, c, g, small, stale) {
  const trains = g.trains;
  const panel = holder.addStack();
  panel.layoutHorizontally();
  panel.centerAlignContent();
  panel.backgroundColor = new Color(C.panel);
  panel.cornerRadius = 11;
  const large = config.widgetFamily === 'large' || config.widgetFamily === 'extraLarge';
  panel.size = new Size(0, small ? 40 : (large ? 76 : 49));
  panel.setPadding(small ? 4 : (large ? 10 : 6), 10,
                   small ? 4 : (large ? 10 : 6), 10);

  const left = panel.addStack();
  left.layoutVertically();
  label(left, directionLabel(c.line, g.dir), small ? 10 : 14,
        LINES[c.line].color, true);
  left.addSpacer(3);
  label(left, trains.length ? ('往' + (STATIONS[trains[0].dest] || trains[0].dest)) : (stale ? '等候更新' : '暫無列車'),
        small ? 10 : 11, C.dim, false);

  panel.addSpacer();
  label(panel, trains.length ? etaLabel(trains[0]) : '—',
        small ? 16 : 25, C.white, true);
}

function fullWidget(c, result, err, adaptive) {
  const w = new ListWidget();
  w.backgroundColor = new Color(C.bg);
  const family = config.widgetFamily || 'small';
  const small = family === 'small';
  const large = family === 'large' || family === 'extraLarge';

  // Smaller edge padding leaves more actual room for the train schedule.
  w.setPadding(small ? 7 : (large ? 12 : 8), small ? 9 : (large ? 14 : 12),
               small ? 7 : (large ? 11 : 8), small ? 9 : (large ? 14 : 12));
  w.url = launchURL(c);
  const longHeader = header(w, c, small);

  if (err) {
    w.addSpacer();
    label(w, '⚠ 無法取得班次', small ? 12 : 15, '#FFB4A9', true);
    const e = w.addText(String(err).slice(0, 85));
    e.font = Font.systemFont(10);
    e.textColor = new Color(C.dim);
    e.lineLimit = 3;

  } else if (c.direction === 'BOTH') {
    w.addSpacer(small ? 2 : 5);
    const groups = result.groups;
    groups.forEach((g, i) => {
      if (i) w.addSpacer();
      directionMiniCard(w, c, g, small, result.cacheAgeMs > 120000);
    });
    // On taller widgets, show a second departure for both directions.
    if (large) {
      w.addSpacer(10);
      groups.forEach(g => {
        if (g.trains.length > 1) {
          label(w, directionLabel(c.line, g.dir), 12, LINES[c.line].color, true);
          nextRow(w, g.trains[1], 1, LINES[c.line].color, false);
        }
      });
    }

  } else {
    const g = result.groups[0];
    w.addSpacer(small ? 2 : 7);
    if (!g || !g.trains.length) {
      w.addSpacer();
      label(w, result.cacheAgeMs > 120000 ? '等候下次更新' : '此方向暫無班次',
            small ? 13 : 16, C.dim, true);
    } else {
      // Small widget: 3 trains, medium: 3, large: all available (up to 4).
      const shown = g.trains.slice(0, large ? 4 :
        (small && longHeader ? 2 : 3));
      arrivalCard(w, shown[0], LINES[c.line].color, family, shown.length);

      shown.slice(1).forEach((train, i) => {
        // Unlike fixed 3px gaps, these spacers use ALL free vertical room.
        w.addSpacer();
        nextRow(w, train, i + 1, LINES[c.line].color, small);
      });
    }
  }

  if (result && result.delayed) {
    w.addSpacer(2);
    label(w, '⚠ 港鐵標示列車延誤', 9, '#FFCE78', true);
  }
  w.addSpacer();
  const policy = refreshPolicy(adaptive);
  const mode = adaptive.enabled ? '⚡' + policy.label + ' · ' : '';
  let footer = result && result.cacheWarning
    ? '⚠ 網絡異常 · 使用短暫快取'
    : mode + '更新 ' + (result ? (clock(result.updated) || '--:--') : '--:--');
  if (result && result.cacheAgeMs > 120000) footer = '⚠低頻快取 · ' + mode + (clock(result.updated) || '--:--');
  label(w, footer, small ? 8 : 10, C.muted, false);

  // Request a slower refresh outside work/commute, but ensure a new commute
  // window can start earlier. Never set a no-refresh pause state.
  const now = Date.now();
  const due = result && Number.isFinite(result.fetchedAt)
    ? result.fetchedAt + policy.intervalMs : now + policy.intervalMs;
  const target = Math.min(Math.max(now + 60000, due), policy.nextBoundary);
  w.refreshAfterDate = new Date(Math.max(now + 60000, target));
  return w;
}

// In-app timetable: refresh without closing screen.
async function showTable(initialChoice) {
  const table = new UITable();
  table.showSeparators = true;
  let choice = initialChoice;
  let adaptive = readAdaptive();
  let busy = false;
  function row(title, subtitle, strong) {
    const r = new UITableRow();
    r.height = 59;
    const cell = r.addText(String(title), String(subtitle || ''));
    if (strong) cell.titleFont = Font.boldSystemFont(16);
    table.addRow(r);
    return r;
  }
  function draw(data, error) {
    table.removeAllRows();
    row('🚇 ' + STATIONS[choice.station] + ' · ' + LINES[choice.line].name, directionLabel(choice.line, choice.direction), true);
    const reloadButton = row(busy ? '↻ 正在刷新…' : '↻ 即時刷新', '每次按下都重新呼叫官方 API', true);
    reloadButton.dismissOnSelect = false;
    reloadButton.onSelect = async () => { if (!busy) await load(); };

    const toggleRow = row('⚡ Adaptive Mode：' + (adaptive.enabled ? '開啟' : '關閉'),
      adaptive.enabled ? '通勤1分鐘／平日非通勤5分鐘／非工作日15分鐘' : '標準模式：要求每60秒更新', true);
    toggleRow.dismissOnSelect = false;
    toggleRow.onSelect = async () => {
      if (busy) return;
      adaptive.enabled = !adaptive.enabled;
      saveAdaptive(adaptive);
      draw(data, error);
    };

    const daysRow = row('📅 工作日：' + (adaptive.workdays.length
      ? adaptive.workdays.map(n => WEEKDAYS[n]).join('、') : '未選擇'), '點擊逐日切換工作日');
    daysRow.dismissOnSelect = false;
    daysRow.onSelect = async () => {
      if (busy) return;
      await chooseWorkdays(adaptive);
      draw(data, error);
    };

    const windowsRow = row('⏰ 通勤時間（香港時間）',
      adaptive.windows.map(w => w[0] + '–' + w[1]).join(' / '));
    windowsRow.dismissOnSelect = false;
    windowsRow.onSelect = async () => {
      if (busy) return;
      await editWindows(adaptive);
      draw(data, error);
    };
    const dirButton = row('⇄ 更改方向', directionLabel(choice.line, choice.direction));
    dirButton.dismissOnSelect = false;
    dirButton.onSelect = async () => {
      if (busy) return;
      const d = await chooseDirection(choice.line, choice.direction);
      if (!d) return;
      choice = Object.assign({}, choice, { direction: d });
      setSaved(choice);
      await load();
    };
    const stationButton = row('⌖ 更換路線／車站', '重新選擇路線、車站及方向');
    stationButton.dismissOnSelect = false;
    stationButton.onSelect = async () => {
      if (busy) return;
      const c = await chooseStation();
      if (c) { choice = c; await load(); }
    };
    if (error) row('⚠ 取得班次失敗', error);
    if (data) {
      data.groups.forEach(g => {
        row(directionLabel(choice.line, g.dir), '月台、預計時間、剩餘分鐘', true);
        if (!g.trains.length) row('暫無班次', '請稍後按即時刷新');
        g.trains.slice(0, 4).forEach(t => {
          row('往' + (STATIONS[t.dest] || t.dest || '未知') + ' · ' + etaLabel(t), platform(t) + ' · 預計 ' + clock(t.time) + (t.route === 'RAC' ? ' · 經馬場' : ''), true);
        });
      });
      if (data.delayed) row('⚠ 港鐵標示列車延誤', '請留意車站廣播');
      row('資料更新：' + (data.updated || '--'), '香港時間 UTC+8 · ' + (data.source || '即時'));
    }
    table.reload();
  }
  async function load() {
    if (busy) return;
    busy = true;
    draw(null, null);
    let data = null, error = null;
    try { data = await getTrains(choice, { force: true, adaptive }); }
    catch (e) { error = e.message || String(e); }
    busy = false;
    draw(data, error);
  }
  await load();
  await table.present();
}

async function main() {
  let choice = argsChoice() || getSaved();
  if (config.runsInApp) {
    if (!choice) choice = await chooseStation();
    if (choice) await showTable(choice);
    return;
  }
  choice = choice || DEFAULT;
  const adaptive = readAdaptive();
  let data = null, error = null;
  try { data = await getTrains(choice, { adaptive, isWidget: true }); }
  catch (e) { error = e.message || String(e); }
  const widget = fullWidget(choice, data, error, adaptive);
  if (config.runsInWidget) Script.setWidget(widget);
  else await widget.presentSmall();
}
await main();
Script.complete();
