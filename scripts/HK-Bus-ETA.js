// HK Bus ETA v2.3 — Scriptable (iOS)
// 九巴 / 城巴、三班車倒數、官方資料時間、獨立收藏
// 新增：智能刷新開關、可選工作日及通勤時段（香港時間）
// Widget 實際背景刷新由 iOS 決定，以下均為「最早要求刷新」。

const APP = {
  foregroundRefreshMs: 30000, // 只在 Scriptable 查詢畫面開啟時使用
  widgetRefreshMs: 60000,    // 關閉智能刷新時的固定要求
  widgetMaxEntries: 2,
  maxEtaBuses: 3,
  commuteRefreshMs: 60000,
  daytimeRefreshMs: 30 * 60000,
  restRefreshMs: 60 * 60000,
  preCommuteMinutes: 10,
};

const BASE_KMB = 'https://data.etabus.gov.hk/v1/transport/kmb';
const BASE_CTB = 'https://rt.data.gov.hk/v2/transport/citybus';
const HK_OFFSET_MS = 8 * 3600000;
const DAY_MS = 86400000;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

const fm = FileManager.local();
const baseFolder = fm.joinPath(fm.documentsDirectory(), 'HKBusETA');
if (!fm.fileExists(baseFolder)) fm.createDirectory(baseFolder, true);

// 每條 Script 一個資料夾，不會共用「收藏」或「智能刷新」設定。
const scriptName = Script.name().replace(/[\\/:*?"<>|]/g, '_');
const ownFolder = fm.joinPath(baseFolder, scriptName);
if (!fm.fileExists(ownFolder)) fm.createDirectory(ownFolder, true);
const favoritesPath = fm.joinPath(ownFolder, 'favorites.json');
const preferencesPath = fm.joinPath(ownFolder, 'settings.json');
const legacyFavoritesPath = fm.joinPath(baseFolder, 'favorites.json');
const kmbStopsPath = fm.joinPath(baseFolder, 'kmb_stops.json');
const ctbStopsPath = fm.joinPath(baseFolder, 'city_stops.json');

// 升級舊版本：只在個別 Script 首次執行時複製一次。
if (!fm.fileExists(favoritesPath) && fm.fileExists(legacyFavoritesPath)) {
  try { fm.copy(legacyFavoritesPath, favoritesPath); } catch (_) {}
}

function readJSON(path, fallback) {
  try { return fm.fileExists(path) ? JSON.parse(fm.readString(path)) : fallback; }
  catch (_) { return fallback; }
}
function saveJSON(path, data) { fm.writeString(path, JSON.stringify(data)); }
function errorText(e) { return String((e && e.message) || e || '未知錯誤'); }
const sleep = ms => new Promise(resolve => Timer.schedule(ms, false, resolve));

let favorites = readJSON(favoritesPath, []);
if (!Array.isArray(favorites)) favorites = [];
function saveFavorites() { saveJSON(favoritesPath, favorites); }

const DEFAULT_PREFS = {
  adaptiveEnabled: true,
  workdays: [1, 2, 3, 4, 5], // 0=星期日，1=星期一，…，6=星期六
  morning: { start: '07:30', end: '09:30' },
  evening: { start: '18:00', end: '20:00' },
};
function validClock(x) {
  return typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
}
function clockMinutes(x) {
  const a = String(x).split(':').map(Number);
  return a[0] * 60 + a[1];
}
function cleanWindow(w, fallback) {
  if (!w || !validClock(w.start) || !validClock(w.end) ||
      clockMinutes(w.start) >= clockMinutes(w.end)) return { ...fallback };
  return { start: w.start, end: w.end };
}
function normalizePrefs(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const days = Array.isArray(raw.workdays)
    ? [...new Set(raw.workdays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))]
    : DEFAULT_PREFS.workdays.slice();
  return {
    adaptiveEnabled: typeof raw.adaptiveEnabled === 'boolean'
      ? raw.adaptiveEnabled : DEFAULT_PREFS.adaptiveEnabled,
    workdays: days,
    morning: cleanWindow(raw.morning, DEFAULT_PREFS.morning),
    evening: cleanWindow(raw.evening, DEFAULT_PREFS.evening),
  };
}
let prefs = normalizePrefs(readJSON(preferencesPath, null));
function savePrefs() { saveJSON(preferencesPath, prefs); }
function workdaysLabel() {
  if (!prefs.workdays.length) return '未選工作日';
  return DAY_ORDER.filter(d => prefs.workdays.includes(d))
    .map(d => '週' + DAY_NAMES[d]).join('、');
}
function hkDate(date) { return new Date(date.getTime() + HK_OFFSET_MS); }
function isWithinWindow(minutes, window) {
  return minutes >= clockMinutes(window.start) && minutes < clockMinutes(window.end);
}

// 只設定 Widget 下一次「可以被 iOS 刷新」嘅最早時間。
// 進入通勤前 10 分鐘會提早要求刷新，非工作日較低頻。
function getRefreshPlan(now = new Date()) {
  if (!prefs.adaptiveEnabled) {
    return { mode: '固定', next: new Date(now.getTime() + APP.widgetRefreshMs) };
  }
  const hk = hkDate(now);
  const weekday = hk.getUTCDay();
  const minutes = hk.getUTCHours() * 60 + hk.getUTCMinutes();
  const isWorkday = prefs.workdays.includes(weekday);
  const during = isWorkday && (
    isWithinWindow(minutes, prefs.morning) ||
    isWithinWindow(minutes, prefs.evening)
  );
  const nextStarts = [];
  const hkMidnightMs = Date.UTC(
    hk.getUTCFullYear(), hk.getUTCMonth(), hk.getUTCDate()
  );
  for (let dayAhead = 0; dayAhead <= 7; dayAhead++) {
    const hkDayMs = hkMidnightMs + dayAhead * DAY_MS;
    const dayOfWeek = new Date(hkDayMs).getUTCDay();
    if (!prefs.workdays.includes(dayOfWeek)) continue;
    for (const window of [prefs.morning, prefs.evening]) {
      const startRealMs = hkDayMs + clockMinutes(window.start) * 60000 - HK_OFFSET_MS;
      const warmupMs = startRealMs - APP.preCommuteMinutes * 60000;
      if (warmupMs > now.getTime()) nextStarts.push(warmupMs);
    }
  }
  const warmup = isWorkday && [prefs.morning, prefs.evening].some(window => {
    const start = clockMinutes(window.start);
    return minutes >= start - APP.preCommuteMinutes && minutes < start;
  });
  const daytime = isWorkday && minutes >= 7 * 60 && minutes < 20 * 60;
  const interval = (during || warmup) ? APP.commuteRefreshMs
    : daytime ? APP.daytimeRefreshMs : APP.restRefreshMs;
  let nextMs = now.getTime() + interval;
  if (nextStarts.length) nextMs = Math.min(nextMs, ...nextStarts);
  return {
    mode: during ? '通勤' : warmup ? '通勤預備' : daytime ? '日間' : '休息',
    next: new Date(nextMs)
  };
}

async function getJSON(url) {
  let lastError;
  const tries = config.runsInWidget ? 2 : 3;
  for (let i = 0; i < tries; i++) {
    try {
      const req = new Request(url);
      req.timeoutInterval = config.runsInWidget ? 7 : 14;
      const json = await req.loadJSON();
      const status = req.response && req.response.statusCode;
      if (status && status >= 400) throw new Error('HTTP ' + status);
      if (!json || !('data' in json)) throw new Error('API 格式不正確');
      return json;
    } catch (e) {
      lastError = e;
      if (i + 1 < tries) await sleep(700 * (i + 1));
    }
  }
  throw lastError || new Error('API 連線失敗');
}
async function alertMessage(title, message) {
  const a = new Alert(); a.title = title; a.message = message;
  a.addAction('知道'); await a.presentAlert();
}
async function choose(title, choices, message = '') {
  const a = new Alert(); a.title = title; a.message = message;
  for (const choice of choices) a.addAction(choice);
  a.addCancelAction('取消');
  const value = await a.presentSheet();
  return value >= 0 && value < choices.length ? value : -1;
}
async function askRoute() {
  const a = new Alert();
  a.title = '輸入巴士路線'; a.message = '例如 59X、1A、968、A21';
  a.addTextField('路線號碼', '59X');
  a.addAction('下一步'); a.addCancelAction('取消');
  if (await a.presentAlert() !== 0) return null;
  const route = a.textFieldValue(0).trim().toUpperCase();
  if (!/^[0-9A-Z]{1,8}$/.test(route)) {
    await alertMessage('路線格式錯誤', '請輸入有效巴士路線號碼');
    return null;
  }
  return route;
}
function directionCode(bound) { return bound === 'outbound' ? 'O' : 'I'; }

async function getRouteStops(company, route, bound) {
  if (company === 'CTB') {
    const res = await getJSON(`${BASE_CTB}/route-stop/CTB/${route}/${bound}`);
    return { serviceType: '1', data: Array.isArray(res.data) ? res.data : [] };
  }
  for (const type of ['1', '2', '3', '4']) {
    try {
      const res = await getJSON(`${BASE_KMB}/route-stop/${route}/${bound}/${type}`);
      if (Array.isArray(res.data) && res.data.length) return { serviceType: type, data: res.data };
    } catch (_) {}
  }
  return { serviceType: '1', data: [] };
}
async function routeLabels(company, route) {
  try {
    let data;
    if (company === 'CTB') data = (await getJSON(`${BASE_CTB}/route/CTB/${route}`)).data;
    else data = (await getJSON(`${BASE_KMB}/route/${route}/outbound/1`)).data;
    return {
      outbound: data && data.dest_tc ? '往 ' + data.dest_tc : '去程 (Outbound)',
      inbound: data && data.orig_tc ? '往 ' + data.orig_tc : '回程 (Inbound)'
    };
  } catch (_) {
    return { outbound: '去程 (Outbound)', inbound: '回程 (Inbound)' };
  }
}
async function getKMBStopMap() {
  const cache = readJSON(kmbStopsPath, null);
  if (cache && cache.savedAt && Date.now() - cache.savedAt < DAY_MS && cache.stops) {
    return cache.stops;
  }
  const res = await getJSON(`${BASE_KMB}/stop`);
  const map = {};
  for (const s of res.data || []) map[s.stop] = s.name_tc || s.name_en || s.stop;
  saveJSON(kmbStopsPath, { savedAt: Date.now(), stops: map });
  return map;
}
async function resolveStops(company, rows) {
  const ordered = rows.slice().sort((a, b) => Number(a.seq) - Number(b.seq));
  if (company === 'KMB') {
    const names = await getKMBStopMap();
    return ordered.map(s => ({ stop: s.stop, seq: String(s.seq), name: names[s.stop] || s.stop }));
  }
  const names = readJSON(ctbStopsPath, {});
  const missing = [...new Set(ordered.map(s => s.stop).filter(id => !names[id]))];
  for (let i = 0; i < missing.length; i += 3) {
    const results = await Promise.all(missing.slice(i, i + 3).map(async id => {
      try {
        const res = await getJSON(`${BASE_CTB}/stop/${id}`);
        return { id, name: res.data && (res.data.name_tc || res.data.name_en) };
      } catch (_) { return { id, name: null }; }
    }));
    for (const r of results) if (r.name) names[r.id] = r.name;
  }
  saveJSON(ctbStopsPath, names);
  return ordered.map(s => ({
    stop: s.stop, seq: String(s.seq), name: names[s.stop] || '巴士站 ' + s.stop
  }));
}
async function selectStop(stops, route, direction) {
  let selected = null;
  const table = new UITable(); table.showSeparators = true;
  const head = new UITableRow(); head.isHeader = true; head.height = 48;
  head.addText(`${route} — ${direction}`, '選擇上車巴士站'); table.addRow(head);
  for (const s of stops) {
    const row = new UITableRow(); row.height = 52;
    row.addText(`${s.seq}. ${s.name}`, s.stop);
    row.onSelect = () => { selected = s; };
    row.dismissOnSelect = true;
    table.addRow(row);
  }
  await table.present();
  return selected;
}
async function addFavorite() {
  const provider = await choose('選擇巴士公司', ['九巴', '城巴']);
  if (provider < 0) return false;
  const company = provider === 0 ? 'KMB' : 'CTB';
  const route = await askRoute(); if (!route) return false;
  const labels = await routeLabels(company, route);
  const i = await choose('選擇方向', [labels.outbound, labels.inbound]);
  if (i < 0) return false;
  const bound = i === 0 ? 'outbound' : 'inbound';
  const directionTitle = i === 0 ? labels.outbound : labels.inbound;
  const result = await getRouteStops(company, route, bound);
  if (!result.data.length) {
    await alertMessage('找不到路線', `${route} 沒有站點資料。請核對路線及公司。`);
    return false;
  }
  const stops = await resolveStops(company, result.data);
  const selected = await selectStop(stops, route, directionTitle);
  if (!selected) return false;
  const item = {
    company, route, bound, serviceType: result.serviceType,
    stop: selected.stop, seq: selected.seq,
    stopName: selected.name, directionTitle
  };
  const key = f => [f.company, f.route, f.bound, f.stop, f.serviceType].join(':');
  if (!favorites.some(f => key(f) === key(item))) favorites.push(item);
  saveFavorites(); return true;
}

function hkt(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return '--:--';
  const hk = hkDate(d);
  return String(hk.getUTCHours()).padStart(2, '0') + ':' +
    String(hk.getUTCMinutes()).padStart(2, '0');
}
function hktSeconds(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return hkt(d) + ':' + String(d.getUTCSeconds()).padStart(2, '0');
}
function etaMinutes(value) {
  return Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60000));
}

async function fetchETA(f) {
  const url = f.company === 'CTB'
    ? `${BASE_CTB}/eta/CTB/${f.stop}/${f.route}`
    : `${BASE_KMB}/eta/${f.stop}/${f.route}/${f.serviceType || '1'}`;
  const res = await getJSON(url);
  const dir = directionCode(f.bound);
  const data = (Array.isArray(res.data) ? res.data : []).filter(r => {
    const matchedDir = String(r.dir || r.bound || '').toUpperCase() === dir;
    const matchedSeq = r.seq == null || f.seq == null || Number(r.seq) === Number(f.seq);
    const matchedRoute = !r.route || String(r.route).toUpperCase() === String(f.route).toUpperCase();
    return matchedDir && matchedSeq && matchedRoute;
  });
  const now = Date.now();
  const seen = new Set();
  const eta = data.filter(r => {
    const ms = new Date(r.eta).getTime();
    if (!Number.isFinite(ms) || ms < now - 30000) return false;
    if (seen.has(r.eta)) return false;
    seen.add(r.eta); return true;
  }).sort((a, b) => new Date(a.eta) - new Date(b.eta)).slice(0, APP.maxEtaBuses);

  const originalTimestamp = data.find(r => r.data_timestamp)?.data_timestamp || null;
  const officialMs = originalTimestamp ? new Date(originalTimestamp).getTime() : NaN;
  const generatedMs = res.generated_timestamp
    ? new Date(res.generated_timestamp).getTime() : NaN;
  // 過期判斷可降級使用回應生成時間；但畫面「官方更新」只用 data_timestamp。
  const stampMs = Number.isFinite(officialMs) ? officialMs : generatedMs;
  const stale = Number.isFinite(stampMs) && now - stampMs > 180000;
  const remark = data.find(r => !r.eta && r.rmk_tc)?.rmk_tc || '';
  return {
    favorite: f, eta, stale, remark, checkedAt: new Date(),
    sourceUpdatedAt: Number.isFinite(officialMs) ? new Date(officialMs) : null,
    error: null
  };
}
async function loadAll(count) {
  return Promise.all(favorites.slice(0, count).map(async f => {
    try { return await fetchETA(f); }
    catch (e) {
      return { favorite: f, eta: [], stale: false, remark: '',
        checkedAt: new Date(), sourceUpdatedAt: null, error: errorText(e) };
    }
  }));
}

// ===========================
// 原有 Widget 排版保持不變
// ===========================
const UI = {
  bg: '#0B1324', fg: '#F8FAFC', muted: '#A1B1C7',
  green: '#5EEAD4', yellow: '#FCD34D', blue: '#8ABFFF', line: '#344257'
};
function wt(parent, value, size, color = UI.fg, bold = false, lines = 1) {
  const t = parent.addText(String(value));
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = lines;
  t.minimumScaleFactor = 0.78;
  return t;
}
function shortStop(value) {
  return String(value || '').replace(/\s*[（(].*$/, '').trim() || String(value || '巴士站');
}
function chosenFavorites() {
  const raw = String(args.widgetParameter || '').trim().toUpperCase();
  if (!raw) return favorites;
  if (/^\d+$/.test(raw) && Number(raw) > 0) {
    const selected = favorites[Number(raw) - 1];
    return selected ? [selected] : favorites;
  }
  const selected = favorites.find(f => String(f.route).toUpperCase() === raw);
  return selected ? [selected] : favorites;
}
function addCountdown(parent, eta, size, color) {
  const d = parent.addDate(new Date(eta));
  d.applyTimerStyle();
  d.font = Font.boldSystemFont(size);
  d.textColor = new Color(color);
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.7;
  return d;
}
function addBusRow(w, record, position, small) {
  const item = record.eta[position];
  const color = position === 0 ? UI.green : position === 1 ? UI.yellow : UI.fg;
  const row = w.addStack();
  row.layoutHorizontally(); row.centerAlignContent(); row.spacing = small ? 3 : 9;
  wt(row, item ? '🚌' + (position + 1) : '— ' + (position + 1),
    small ? 11 : 14, item ? UI.fg : UI.muted, !!item);
  row.addSpacer();
  if (item) {
    addCountdown(row, item.eta, small ? 17 : 22, record.stale ? UI.yellow : color);
    row.addSpacer(small ? 3 : 14);
    wt(row, hkt(item.eta), small ? 10 : 14, UI.muted);
  } else {
    wt(row, '未有預測', small ? 10 : 13, UI.muted);
  }
}
function addBusCard(w, record, family) {
  const small = family === 'small';
  const f = record.favorite;
  const top = w.addStack(); top.layoutHorizontally(); top.centerAlignContent();
  wt(top, f.route, small ? 24 : 29, UI.fg, true);
  top.addSpacer();
  wt(top, '↻ 點擊刷新', small ? 9 : 12, UI.blue);
  w.addSpacer(small ? 1 : 3);
  wt(w, small ? shortStop(f.stopName) : f.stopName,
    small ? 14 : 17, UI.fg, true, small ? 1 : 2);
  wt(w, f.directionTitle || '', small ? 10 : 12, UI.muted);
  w.addSpacer(small ? 4 : 6);
  if (record.error) {
    wt(w, '連線失敗 · 點擊再試', small ? 12 : 15, '#FCA5A5');
    wt(w, String(record.error).slice(0, 32), 9, UI.muted);
  } else if (record.stale) {
    wt(w, '⚠️ 營運商 ETA 資料延遲', 10, UI.yellow);
    wt(w, '請勿單靠倒數趕車', 10, UI.muted);
  } else if (!record.eta.length) {
    wt(w, record.remark || '目前未有巴士到站預測', small ? 11 : 14, UI.muted, false, 2);
    wt(w, '— 第一班   — 第二班   — 第三班', 9, UI.muted);
  } else {
    if (!small) {
      const heading = w.addStack(); heading.layoutHorizontally();
      wt(heading, '班次', 10, UI.muted); heading.addSpacer();
      wt(heading, '倒數 / 預計到站', 10, UI.muted);
    }
    for (let i = 0; i < 3; i++) {
      w.addSpacer(small ? 1 : 4);
      addBusRow(w, record, i, small);
    }
  }
  w.addSpacer(small ? 2 : 6);
  const official = record.sourceUpdatedAt ? hktSeconds(record.sourceUpdatedAt) : null;
  wt(w, `官方更新 ${official ? official + ' HKT' : '時間未提供'}${record.error ? ' · 失敗' : ''}`,
    small ? 9 : 10, UI.muted);
}
async function showWidget() {
  const w = new ListWidget();
  const family = config.widgetFamily || 'small';
  w.backgroundColor = new Color(UI.bg);
  w.setPadding(family === 'small' ? 8 : 13, family === 'small' ? 9 : 14,
    family === 'small' ? 7 : 13, family === 'small' ? 9 : 14);
  w.url = URLScheme.forRunningScript();
  w.refreshAfterDate = getRefreshPlan(new Date()).next;
  if (!favorites.length) {
    wt(w, '🚌 香港巴士 ETA', 18, UI.fg, true);
    w.addSpacer(8);
    wt(w, '先在 Scriptable 選擇路線與巴士站', 12, UI.muted, false, 3);
  } else {
    const selected = chosenFavorites();
    const max = family === 'large' || family === 'extraLarge'
      ? Math.min(APP.widgetMaxEntries, selected.length) : 1;
    const rows = await Promise.all(selected.slice(0, max).map(async f => {
      try { return await fetchETA(f); }
      catch (e) { return {
        favorite: f, eta: [], stale: false, error: errorText(e),
        checkedAt: new Date(), sourceUpdatedAt: null, remark: ''
      }; }
    }));
    for (let i = 0; i < rows.length; i++) {
      if (i > 0) {
        w.addSpacer(9); wt(w, '━━━━━━━━━━━━━━━━━━', 9, UI.line); w.addSpacer(7);
      }
      addBusCard(w, rows[i], family);
    }
  }
  Script.setWidget(w);
  Script.complete();
}

// ===========================
// 新增設定畫面（不更動 Widget UI）
// ===========================
async function chooseWorkdays() {
  let days = prefs.workdays.slice();
  while (true) {
    const labels = DAY_ORDER.map(d => `${days.includes(d) ? '✓' : '○'} 星期${DAY_NAMES[d]}`);
    const i = await choose('選擇返工日', [...labels, '✅ 完成'], '逐日切換；完成後才儲存');
    if (i < 0) return;
    if (i === DAY_ORDER.length) {
      prefs.workdays = days;
      savePrefs();
      return;
    }
    const d = DAY_ORDER[i];
    days = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
  }
}
async function editWindow(which) {
  const existing = prefs[which];
  const a = new Alert();
  a.title = which === 'morning' ? '返工時段' : '放工時段';
  a.message = '香港時間 HH:MM，當日開始時間要早於結束時間';
  a.addTextField('開始 HH:MM', existing.start);
  a.addTextField('結束 HH:MM', existing.end);
  a.addAction('儲存'); a.addCancelAction('取消');
  if (await a.presentAlert() !== 0) return;
  const start = a.textFieldValue(0).trim();
  const end = a.textFieldValue(1).trim();
  if (!validClock(start) || !validClock(end) || clockMinutes(start) >= clockMinutes(end)) {
    await alertMessage('時間格式錯誤', '請使用 07:30 等 24 小時格式，且開始早於結束。');
    return;
  }
  prefs[which] = { start, end };
  savePrefs();
}
async function showSettings() {
  while (true) {
    const i = await choose('⚙ 通勤智能刷新設定', [
      `智能刷新：${prefs.adaptiveEnabled ? '開啟 ✓' : '關閉 ○'}`,
      `返工日：${workdaysLabel()}`,
      `返工：${prefs.morning.start}–${prefs.morning.end}`,
      `放工：${prefs.evening.start}–${prefs.evening.end}`,
      '恢復預設',
      '✅ 完成'
    ], '只影響此 Script 的 Widget 刷新請求，iOS 不保證準時執行。');
    if (i < 0 || i === 5) break;
    if (i === 0) {
      prefs.adaptiveEnabled = !prefs.adaptiveEnabled;
      savePrefs();
    } else if (i === 1) await chooseWorkdays();
    else if (i === 2) await editWindow('morning');
    else if (i === 3) await editWindow('evening');
    else if (i === 4) {
      const confirm = await choose('恢復通勤設定？', ['確定恢復預設']);
      if (confirm === 0) {
        prefs = normalizePrefs(DEFAULT_PREFS);
        savePrefs();
      }
    }
  }
}

// ===========================
// Scriptable 前台查詢畫面
// ===========================
async function showApp() {
  if (!favorites.length) {
    const added = await addFavorite();
    if (!added && !favorites.length) {
      await alertMessage('未設定路線', '重新執行腳本以新增巴士路線。');
      Script.complete(); return;
    }
  }
  const table = new UITable(); table.showSeparators = true;
  let busy = false;
  let configuring = false;
  function header(title, subtitle) {
    const row = new UITableRow(); row.isHeader = true; row.height = 50;
    row.addText(title, subtitle); table.addRow(row);
  }
  async function removeItem(target) {
    if (configuring) return;
    const choice = await choose('刪除常用巴士站？', [`刪除 ${target.route} · ${target.stopName}`]);
    if (choice !== 0) return;
    favorites = favorites.filter(f => f !== target);
    saveFavorites();
    await refreshTable(true);
  }
  function buttonRow() {
    const row = new UITableRow(); row.height = 50;
    const reload = row.addButton('🔄 立即刷新'); reload.widthWeight = 45;
    reload.onTap = () => refreshTable();
    const add = row.addButton('＋ 新增路線'); add.widthWeight = 45;
    add.onTap = async () => {
      if (configuring) return;
      configuring = true;
      try { if (await addFavorite()) await refreshTable(true); }
      catch (e) { await alertMessage('新增失敗', errorText(e)); }
      finally { configuring = false; }
    };
    table.addRow(row);
    const row2 = new UITableRow(); row2.height = 44;
    const settings = row2.addButton('⚙ 通勤設定（智能刷新／返工日／時段）');
    settings.onTap = async () => {
      if (configuring) return;
      configuring = true;
      try { await showSettings(); await refreshTable(true); }
      catch (e) { await alertMessage('設定失敗', errorText(e)); }
      finally { configuring = false; }
    };
    table.addRow(row2);
  }
  function drawRows(results) {
    table.removeAllRows();
    header('🚌 香港巴士 · 實時到站',
      `香港時間 ${hkt(new Date())} · 前台每 ${APP.foregroundRefreshMs / 1000} 秒查詢`);
    buttonRow();
    for (const result of results) {
      const f = result.favorite;
      const head = new UITableRow(); head.height = 55;
      const cell = head.addText(`${f.route}  ${f.stopName}`,
        `${f.company === 'KMB' ? '九巴' : '城巴'} · ${f.directionTitle}`);
      cell.widthWeight = 86;
      const del = head.addButton('移除'); del.widthWeight = 14;
      del.onTap = () => removeItem(f);
      table.addRow(head);
      if (result.error) {
        const row = new UITableRow(); row.height = 44;
        const c = row.addText('⚠️ 連線失敗', result.error);
        c.titleColor = new Color('#DC2626'); table.addRow(row);
      } else if (!result.eta.length) {
        const row = new UITableRow(); row.height = 44;
        row.addText('目前未有預計到站時間', result.remark || '暫時沒有 ETA');
        table.addRow(row);
      } else {
        result.eta.forEach((item, i) => {
          const row = new UITableRow(); row.height = 55;
          const wait = etaMinutes(item.eta);
          const left = row.addText(`${i + 1}. ${wait} 分鐘`, `預計 ${hkt(item.eta)} (香港時間)`);
          left.widthWeight = 50;
          left.titleFont = Font.boldSystemFont(17);
          left.titleColor = new Color(wait <= 3 ? '#DC2626' : wait <= 8 ? '#D97706' : '#059669');
          const right = row.addText(item.dest_tc || f.directionTitle,
            item.rmk_tc || (result.stale ? '資料可能延遲' : ''));
          right.widthWeight = 50;
          right.subtitleFont = Font.systemFont(10);
          table.addRow(row);
        });
      }
      if (result.stale) {
        const row = new UITableRow(); row.height = 38;
        const c = row.addText('⚠️ 營運商資料超過 3 分鐘未更新', '請勿單靠此 ETA 判斷是否趕到');
        c.titleColor = new Color('#D97706'); table.addRow(row);
      }
    }
    header('通勤設定', `智能：${prefs.adaptiveEnabled ? '開' : '關'} · ${workdaysLabel()} · ${prefs.morning.start}–${prefs.morning.end} / ${prefs.evening.start}–${prefs.evening.end}`);
    table.reload();
  }
  async function refreshTable(force = false) {
    if (busy || (configuring && !force)) return;
    busy = true;
    try { drawRows(await loadAll(favorites.length)); }
    catch (e) { await alertMessage('刷新失敗', errorText(e)); }
    finally { busy = false; }
  }
  await refreshTable(true);
  const timer = Timer.schedule(APP.foregroundRefreshMs, true, () => refreshTable());
  try { await table.present(); }
  finally { timer.invalidate(); Script.complete(); }
}

if (config.runsInWidget) {
  await showWidget();
} else {
  try { await showApp(); }
  catch (e) { await alertMessage('香港巴士 ETA 發生錯誤', errorText(e)); Script.complete(); }
}