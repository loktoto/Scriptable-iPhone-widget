// Expense Tracker HK v3.11.2 — Adaptive widgets, resilient Dictionary / JSON / fallback text, non-zero amount, Siri-safe
// Replace ALL code in the existing Scriptable script; do NOT append to the old script.
let __expensePhase = "初始化";
async function runExpenseTrackerHK() {
// Expense Tracker HK v3.11.2 — iPhone Scriptable + Apple Intelligence + FX
// No API key; FX uses Frankfurter (https://frankfurter.dev/).
// FX only sends currency pair + date (NOT merchant, amount or card) over HTTPS.
// Record only non-zero valid amounts (positive expenses; negative refunds).
// Amounts stay in original currency; HKD estimates are separately stored.
// Saved records remain available if FX network fails. Use menu Retry FX later.
// Shortcut: Run Script -> select this script -> Shortcut Parameter = Dictionary, JSON string, legacy text, or Wallet pipe text.
// Apple Intelligence input: {Date:"20261031_004015", Card:null, MerchantName:null, MerchantType:null, Currency:null, Amount:null}.
// Strict amount extraction: accepts numeric field or nested {content,uuid}; never guesses an amount from unrelated digits.
// Keep this script in a non-shared Scriptable installation and back up often.
// Wallet pipe: date|amount|category|merchant|card|currency|wallet-timestamp-id.
// A unique payment timestamp ID prevents legitimate same-merchant/same-amount taps from being skipped.
// Widget: supports small / medium / large / iPad extraLarge; previews from app menu.
// Storage is on-device. Use Export / Backup regularly.
// Extraction order: native Dictionary > JSON > JSON in prose > bounded key-value fallback > legacy pipe text.
// Diagnostics report only input type, field names and amounts, never raw card or merchant text.

__expensePhase = '開啟本機檔案';
const fm = FileManager.local();
const root = fm.joinPath(fm.documentsDirectory(), 'ExpenseTrackerHK');
if (!fm.fileExists(root)) fm.createDirectory(root, true);
const dbPath = fm.joinPath(root, 'transactions.json');
const shortcutAuditPath = fm.joinPath(root,'last-shortcut-run.json');
function recordShortcutAttempt(stage,details={}) {
  try {
    const report={version:'3.11.2',lastAttemptAt:new Date().toISOString(),
      script:typeof Script.name==='function'?Script.name():'unknown',
      stage,...details};
    fm.writeString(shortcutAuditPath,JSON.stringify(report,null,2));
  } catch(e){console.warn('Shortcut diagnostic unavailable: '+String(e));}
}
const exportPath = fm.joinPath(root, 'transactions.csv');
const backupPath = fm.joinPath(root, 'backup.json');
const fxCachePath = fm.joinPath(root, 'fx-cache.json');
const FX_API = 'https://api.frankfurter.dev/v2/rate/';
const FX_LIMIT_PER_RUN = 3; // Avoid long Wallet Shortcut execution. Remaining FX can be retried.
let fxCache = {};
try { if (fm.fileExists(fxCachePath)) fxCache=JSON.parse(fm.readString(fxCachePath)); } catch (_) { fxCache={}; }
__expensePhase = '讀取記帳資料庫';
let db = { version: 1, transactions: [] };
if (fm.fileExists(dbPath)) {
  try {
    const stored = JSON.parse(fm.readString(dbPath));
    if (!stored || !Array.isArray(stored.transactions)) throw new Error('Invalid database structure');
    db = stored;
  } catch (e) {
    throw new Error('Unable to read saved records. Database was not overwritten: ' + e.message);
  }
}

function z(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`; }
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y,m-1,d);
  return dt.getFullYear() === y && dt.getMonth()+1 === m && dt.getDate() === d;
}
function dateText(x) {
  if (x === null || x === undefined) return null;
  if (x instanceof Date) return `${x.getFullYear()}-${z(x.getMonth()+1)}-${z(x.getDate())}`;
  const s = String(x).trim();
  // Apple Intelligence / Shortcuts Date: YYYYMMDD_HHMMSS, e.g. 20261031_004015.
  let m = s.match(/^(20\d{2})(\d{2})(\d{2})(?:[_T](\d{2})(\d{2})(\d{2}))?$/);
  if (m) { const v=`${m[1]}-${m[2]}-${m[3]}`; return validDate(v) ? v : null; }
  m = s.match(/(20\d{2})[-\/年.](\d{1,2})[-\/月.](\d{1,2})日?/);
  if (m) { const v = `${m[1]}-${z(m[2])}-${z(m[3])}`; return validDate(v) ? v : null; }
  m = s.match(/(\d{1,2})月\s*(\d{1,2})\s*(?:日)?\s*[,，]?\s*(20\d{2})/);
  if (m) { const v = `${m[3]}-${z(m[1])}-${z(m[2])}`; return validDate(v) ? v : null; }
  return null;
}
function timestampText(x) {
  if (x===null || x===undefined) return null;
  const s=String(x).trim();
  let m=s.match(/^(20\d{2})(\d{2})(\d{2})[_T](\d{2})(\d{2})(\d{2})$/);
  if (!m) m=s.match(/^(20\d{2})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const date=`${m[1]}-${m[2]}-${m[3]}`;
  const [h,mi,se]=[m[4],m[5],m[6]].map(Number);
  if(!validDate(date)||h>23||mi>59||se>59)return null;
  return `${date}T${m[4]}:${m[5]}:${m[6]}`;
}
// Apple Shortcuts can wrap typed values as {content:'9.6',uuid:'...'}.
// Never interpret UUID, card number or unknown object properties as an amount.
function shortcutValue(x,depth=0) {
  if(depth>7 || x===null || x===undefined)return null;
  if(x instanceof Date)return x;
  if(Array.isArray(x))return x.length===1?shortcutValue(x[0],depth+1):null;
  if(typeof x==='object'){
    for(const k of ['content','value','text','number','string','result','output','data']){
      if(Object.prototype.hasOwnProperty.call(x,k)){
        const v=shortcutValue(x[k],depth+1);
        if(v!==null && v!==undefined)return v;
      }
    }
    return null;
  }
  if(typeof x==='string'){
    const v=x.replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
    return (!v || /^(null|undefined|none|n\/?a|nil|未提供|未知)$/i.test(v))?null:v;
  }
  return x;
}
function normalizedKey(key){return String(key).toLowerCase().replace(/[\s_\-]+/g,'');}
function field(t,...keys){
  if(!t || typeof t!=='object')return null;
  for(const k of keys){
    if(Object.prototype.hasOwnProperty.call(t,k)){
      const v=shortcutValue(t[k]);
      if(v!==null && v!==undefined && v!=='')return v;
    }
  }
  const wanted=new Set(keys.map(normalizedKey));
  for(const k of Object.keys(t)){
    if(wanted.has(normalizedKey(k))){
      const v=shortcutValue(t[k]);
      if(v!==null && v!==undefined && v!=='')return v;
    }
  }
  return null;
}
function moneyValue(x) {
  x=shortcutValue(x);
  if (x===null || x===undefined || typeof x==='boolean') return null;
  if (typeof x==='number') return Number.isFinite(x) && x!==0 ? x : null;
  let s=String(x).trim();
  if (!s || /^(null|undefined|n\/?a|none)$/i.test(s)) return null;
  s=s.replace(/[\s,，]/g,'');
  const sign=/^[+-]/.test(s)?s[0]:'';
  if(sign)s=s.slice(1);
  s=s.replace(/^(HK\$|HKD|CNY|RMB|US\$|USD|JPY|EUR|GBP|AUD|TWD|MOP|SGD|港元|人民幣|美元|￥|¥|€|£|\$)/i,'')
    .replace(/(HK\$|HKD|CNY|RMB|US\$|USD|JPY|EUR|GBP|AUD|TWD|MOP|SGD|港元|人民幣|美元|￥|¥|€|£|\$)$/i,'');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(s)) return null;
  const n=Number(sign+s);
  return Number.isFinite(n) && n!==0 ? n : null;
}
function currencyFrom(v) {
  if(v===null||v===undefined)return '';
  const s=String(v).trim().toUpperCase();
  if(!s||/^(NULL|UNKNOWN|未提供|未知|未指定)$/.test(s))return '';
  if(/HK\$|港元|港幣/.test(s))return 'HKD';
  if(/RMB|人民幣/.test(s))return 'CNY';
  if(/US\$|美元/.test(s))return 'USD';
  if(s==='€')return 'EUR';
  if(s==='£')return 'GBP';
  // ¥ alone is ambiguous between CNY and JPY. Do not infer.
  if(s==='¥'||s==='￥'||s==='$')return '';
  const codes=s.match(/\b[A-Z]{3}\b/g);
  return codes && codes.length===1?codes[0]:'';
}
function merchantName(x) {
  return String(x||'').trim().replace(/\s+/g,' ').replace(/^商戶名稱\s*[:：]\s*/,'');
}
const merchantRules = [
  ['交通', /(KOWLOON MOTO|METRO OPERATION|MTR|KMB|CITYBUS|港鐵|鐵路|八達通|巴士|的士|UBER TRIP)/i],
  ['便利店', /(CIRCLE K|7-ELEVEN|7 ELEVEN|OK便利店)/i],
  ['超市雜貨', /(AEON|MARKET PLACE|WELLCOME|GREENPRICE|DS GROCERIES|MING FRUIT|FRESH MIST)/i],
  ['餐飲', /(TEN REN TEA|HAMA.SUSHI|FROSTY JOY|CAFE DE CORAL|SANG ROASTERY|WING WAH CAKE|YUET EAT|STARBUCKS|AROME BAKERY|CHEF DE SINGAPORE|HIKINIKU|ZOoba|CAF CAFE|GELATO|MAN FUNG DUMPLING)/i],
  ['健康醫療', /(HUMAN HEALTH|MANNINGS|MATSUMOTO|松本|SA SA COSMETIC)/i],
  ['旅遊娛樂', /(DISNEYLAND|迪士尼)/i],
];
function categoryOf(raw, merchant) {
  const c=String(raw||'').trim();
  // Automated categories are more reliable than old fields such as "HK$" or "未知".
  const match=merchantRules.find(([_,re])=>re.test(merchant));
  if (match) return match[0];
  if (!c || /^(未指定|未提供|未知|HK\$|HKD|CNY|RMB|港元|人民幣)$/i.test(c)) return '未分類';
  if (/餐飲|食肆|餐廳/.test(c) || /^(restaurants?|dining|food|food & beverage|cafe|coffee shop)$/i.test(c)) return '餐飲';
  if (/零售|購物/.test(c)) return '零售';
  if (/旅遊|娛樂/.test(c)) return '旅遊娛樂';
  if (/交通/.test(c)) return '交通';
  if (/醫療|健康/.test(c)) return '健康醫療';
  if (/超市|雜貨/.test(c)) return '超市雜貨';
  // A merchant name accidentally stored in the sector field is not a category.
  if (c.toLowerCase()===merchant.toLowerCase()) return '未分類';
  return c.slice(0,30);
}
function hash(s) { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0).toString(16); }
function normalize(t) {
  // Supports PascalCase, camelCase, and nested Shortcut output objects with content/uuid.
  if(!t||typeof t!=='object')return null;
  const rawAmount=field(t,'Amount','amount','totalAmount','transactionAmount','金額','消費金額','付款金額','交易金額');
  const amount=moneyValue(rawAmount);
  if(amount===null)return null; // Reject invalid, missing or zero amounts.
  const rawMerchant=field(t,'MerchantName','merchantName','merchant','shop','store','storeName','vendor','商戶名稱','商戶','店舖');
  const merchant=merchantName(rawMerchant)||'未提供商戶';
  const rawCategory=String(field(t,'MerchantType','merchantType','category','categoryName','消費類別','消費sector','sector','類別')||'');
  const rawDate=field(t,'Date','date','transactionDate','日期','今日日期','交易日期');
  const date=dateText(rawDate);
  const transactionTime=timestampText(field(t,'TransactionTime','transactionTime','timestamp','Date','date','transactionDate'));
  const currency=currencyFrom(field(t,'Currency','currency','currencyCode','貨幣','幣種'))
    ||currencyFrom(rawAmount)||currencyFrom(rawCategory)||'UNKNOWN';
  const card=String(field(t,'Card','card','cardName','信用卡','卡名','付款方式')||'').trim();
  const suppliedId=String(field(t,'id','ID','transactionId','TransactionID','交易ID')||'').trim();
  const source=String(field(t,'Source','source')||'Shortcut').trim();
  const eventId=suppliedId || (transactionTime?
    'time:'+hash([transactionTime,merchant.toLowerCase(),card.toLowerCase(),amount,currency].join('|')):'');
  return {
    id:eventId,date,transactionTime,amount,currency,
    category:categoryOf(rawCategory,merchant),merchant,card,source,
    originalCategory:rawCategory,createdAt:new Date().toISOString(),
    amountHKD:currency==='HKD'?amount:null,
    fxRate:currency==='HKD'?1:null,fxDate:currency==='HKD'?date:null,
    fxSource:currency==='HKD'?'original HKD':null,
    fxStatus:currency==='HKD'?'native':currency==='UNKNOWN'?'unknown_currency':'pending'
  };
}
function parsePipe(line) {
  const pieces=line.split(/[｜|]/).map(s=>s.trim());
  if(pieces.length<2) return null;
  const first=pieces[0].replace(/^今日日期\s*[:：]?\s*/,'').trim();
  const hasDate=Boolean(dateText(first)||timestampText(first));
  // Formats: date | amount | category | merchant | card | currency | id
  //       or amount | category | merchant | card
  const a=hasDate?1:0;
  const amount=pieces[a].replace(/^金額\s*[:：]\s*/,'');
  if(moneyValue(amount)===null)return null;
  return {date:hasDate?first:null,amount,
    category:(pieces[a+1]||'').replace(/^(消費sector|消費類別)\s*[:：]\s*/i,''),
    merchant:(pieces[a+2]||'').replace(/^商戶名稱\s*[:：]\s*/,''),
    card:pieces[a+3]||'',currency:pieces[a+4]||'',id:pieces[a+5]||''};
}
// Read only explicitly named transaction keys; do NOT scan for arbitrary numbers.
const LOOSE_ALIASES = {
  amount:['amount','totalAmount','transactionAmount','金額','消費金額','付款金額','交易金額'],
  merchantName:['merchantName','merchant','shop','store','storeName','vendor','商戶名稱','商戶','店舖'],
  merchantType:['merchantType','category','categoryName','sector','消費類別','消費sector','類別'],
  currency:['currency','currencyCode','貨幣','幣種'],
  card:['card','cardName','信用卡','卡名','付款方式'],
  date:['date','transactionDate','日期','今日日期','交易日期'],
  id:['transactionId','TransactionID','交易ID']
};
const LOOSE_CANONICAL={};
for(const canonical of Object.keys(LOOSE_ALIASES)){
  for(const key of LOOSE_ALIASES[canonical])LOOSE_CANONICAL[normalizedKey(key)]=canonical;
}
// Read a balanced JSON segment inside prose / Markdown. Strings and escapes respected.
function balancedEnd(text,start){
  const stack=[], close={'}':'{',']':'['};
  let quote='',escaped=false;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(quote){
      if(escaped){escaped=false;continue;}
      if(c==='\\'){escaped=true;continue;}
      if(c===quote)quote='';
      continue;
    }
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='{'||c==='['){stack.push(c);continue;}
    if(c==='}'||c===']'){
      if(stack.pop()!==close[c])return -1;
      if(!stack.length)return i+1;
    }
  }
  return -1;
}
function embeddedJSON(text){
  // Try at most 12 structure starts; never evaluate generated JavaScript.
  let attempts=0;
  for(let i=0;i<text.length && attempts<12;i++){
    if(text[i]!=='{' && text[i]!=='[')continue;
    attempts++;
    const end=balancedEnd(text,i);
    if(end<0)continue;
    try{return JSON.parse(text.slice(i,end));}catch(_){ }
  }
  return null;
}
function decodeLooseValue(raw){
  let s=String(raw||'').trim().replace(/[,;]\s*$/,'').trim();
  if(!s)return null;
  if(s[0]==='{'){
    const end=balancedEnd(s,0), body=end>0?s.slice(0,end):s;
    try{return JSON.parse(body);}catch(_){
      // For a malformed nested Shortcuts object, recover ONLY content/value/text.
      const m=body.match(/(?:^|[{,\s])['"“”]?(content|value|text|number)['"“”]?\s*[:：=]\s*(?:['"“”]([^'"“”\r\n]+)['"“”]|([^,}\r\n]+))/i);
      return m?{content:(m[2]||m[3]).trim()}:null;
    }
  }
  if(s[0]==='"'){
    try{return JSON.parse(s);}catch(_){ }
  }
  if(/^["'“「]/.test(s)){
    const q=s[0], closing=q==='“'?'”':q==='「'?'」':q;
    // Use the last closing quote to preserve embedded commas or punctuation.
    const index=s.lastIndexOf(closing);
    if(index>0)s=s.slice(1,index);
    else s=s.slice(1);
  }
  return s.replace(/\\(["'\\])/g,'$1').trim();
}
function looseDictionary(text){
  // Recognizes key: value, "key": value, key = value and Chinese keys.
  // Matches keys only at an object/line/pair boundary, not in merchant prose.
  const pattern=/(^|[,{;\r\n]\s*(?:[-*•]\s*)?)["'“”]?([\p{L}_][\p{L}\p{N}_ -]*)["'“”]?\s*[:：=]\s*/gimu;
  const hits=[];
  let m;
  while((m=pattern.exec(text))!==null){
    const canonical=LOOSE_CANONICAL[normalizedKey(m[2])];
    if(canonical)hits.push({canonical,start:m.index,end:pattern.lastIndex});
  }
  if(!hits.length)return null;
  const record={};
  for(let i=0;i<hits.length;i++){
    const h=hits[i],next=hits[i+1];
    const end=next?next.start:text.length;
    let raw=text.slice(h.end,end).trim();
    // Tolerate trailing fences, braces and prose after the last field.
    raw=raw.replace(/\s*```[\s\S]*$/,'').trim();
    const objEnd=raw[0]==='{'?balancedEnd(raw,0):-1;
    if(objEnd>0)raw=raw.slice(0,objEnd);
    else if(raw[0]!=='{' && raw[0]!=='"' && raw[0]!=="'" && raw[0]!=='“'){
      // Restrict bare values to first line (and comma separator unless 1,234 grouping).
      raw=raw.split(/\r?\n/)[0];
      raw=raw.replace(/,(?=\s*(?:["'“”]?[a-zA-Z\p{L}_][\p{L}\p{N}_ -]*["'“”]?\s*[:：=]|$))/u,'');
      raw=raw.replace(/[,}\]]+\s*$/,'');
    }
    const value=decodeLooseValue(raw);
    if(value!==null && value!==undefined && value!==''){
      // Prefer first valid nonempty value; never use arbitrary content/uuid as field names.
      if(record[h.canonical]===undefined)record[h.canonical]=value;
    }
  }
  return record.amount===undefined?null:record;
}
let lastParseMethod='unknown';
function parseInput(input,depth=0){
  if(depth>7)return [];
  if(Array.isArray(input)){
    lastParseMethod='原生清單';
    return input.flatMap(v=>parseInput(v,depth+1));
  }
  if(typeof input==='object' && input!==null){
    const direct=normalize(input);
    if(direct){lastParseMethod='原生 Dictionary';return [direct];}
    // Common AI/Shortcut wrappers; follow known properties only.
    const wrapperKeys=new Set(['transactions','records','items','result','output','payload','data','dictionary','response','content','text','modelresponse','structuredoutput','answer','body']);
    for(const k of Object.keys(input)){
      if(wrapperKeys.has(normalizedKey(k))){
        const found=parseInput(input[k],depth+1);
        if(found.length)return found;
      }
    }
    lastParseMethod='Dictionary（無有效金額）';
    return [];
  }
  const text=String(input??'').trim();
  if(!text)return [];
  // Preferred: strict JSON (including valid JSON arrays).
  if(text[0]==='{'||text[0]==='['){
    try{
      const result=parseInput(JSON.parse(text),depth+1);
      if(result.length){lastParseMethod='JSON';return result;}
    }catch(_){ }
  }
  // JSON inside a Markdown code fence, explanation or other surrounding text.
  const json=embeddedJSON(text);
  if(json!==null){
    const result=parseInput(json,depth+1);
    if(result.length){lastParseMethod='內嵌 JSON';return result;}
  }
  // Last-resort: bounded extraction by known field names, never by naked digits.
  const loose=looseDictionary(text);
  if(loose){
    const normalized=normalize(loose);
    if(normalized){lastParseMethod='Regex 容錯';return [normalized];}
  }
  // Legacy Apple Wallet pipe lines + previous Chinese label format.
  let results=[],pending={};
  function commit(){const n=normalize(pending);if(n)results.push(n);pending={};}
  for(const raw of text.split(/\r?\n/)){
    const line=raw.trim();
    if(!line||/^無法處理該請求/.test(line))continue;
    if(/[｜|]/.test(line)){
      if(pending.amount!==undefined)commit();
      const t=parsePipe(line);
      if(t){const n=normalize(t);if(n)results.push(n);}
      continue;
    }
    let m=line.match(/^今日日期\s*[:：]\s*(.*)$/);
    if(m){if(pending.amount!==undefined)commit();pending.date=m[1];continue;}
    m=line.match(/^金額\s*[:：]\s*(.*)$/);
    if(m){if(pending.amount!==undefined)commit();pending.amount=m[1];continue;}
    m=line.match(/^(?:消費sector|消費類別)\s*[:：]\s*(.*)$/i);
    if(m){pending.category=m[1];continue;}
    m=line.match(/^商戶名稱\s*[:：]\s*(.*)$/);
    if(m){pending.merchant=m[1];commit();continue;}
  }
  commit();
  lastParseMethod=results.length?'舊版文字格式':'無法解析有效交易';
  return results;
}
function giveIds(rows) {
  for(const t of rows) {
    if(t.id){t.id='external:'+t.id;continue;}
    // No stable ID or exact transaction timestamp: do not silently drop valid
    // same-day/same-amount purchases. Retries can duplicate these records.
    t.id='generated:'+Date.now()+':'+Math.random().toString(36).slice(2,14);
  }
  return rows;
}
function ensureFxFields(t) {
  if(t.currency==='HKD'){
    t.amountHKD=t.amount;t.fxRate=1;t.fxDate=t.date||null;
    t.fxSource='original HKD';t.fxStatus='native';return;
  }
  if(t.currency==='UNKNOWN'){
    t.amountHKD=null;t.fxRate=null;t.fxDate=null;
    t.fxSource=null;t.fxStatus='unknown_currency';return;
  }
  if(t.fxStatus==='converted' && Number.isFinite(t.amountHKD) && t.fxRate>0)return;
  t.amountHKD=null;t.fxRate=null;t.fxDate=null;t.fxSource=null;t.fxStatus='pending';
}
// Frankfurter documents /v2/rate/{base}/{quote}?date=YYYY-MM-DD.
// Its response is {date, base, quote, rate}. Weekends may use older published rates.
async function getFXRate(from,date) {
  const effectiveDate=(date && date<=today())?date:null;
  const key=from+'|HKD|'+(effectiveDate||'latest');
  if(fxCache[key] && Number(fxCache[key].rate)>0)return fxCache[key];
  const query=effectiveDate?'?date='+encodeURIComponent(effectiveDate):'';
  const request=new Request(FX_API+encodeURIComponent(from.toLowerCase())+'/hkd'+query);
  request.timeoutInterval=5;
  const data=await request.loadJSON();
  if(!data||!Number.isFinite(Number(data.rate))||Number(data.rate)<=0 ||
     String(data.base).toUpperCase()!==from || String(data.quote).toUpperCase()!=='HKD') {
    throw new Error('Invalid FX response for '+from);
  }
  const result={rate:Number(data.rate),date:String(data.date||''),source:'Frankfurter v2',fetchedAt:new Date().toISOString()};
  fxCache[key]=result;
  fm.writeString(fxCachePath,JSON.stringify(fxCache,null,2));
  return result;
}
async function updateFX(maxCalls=FX_LIMIT_PER_RUN,force=false){
  let converted=0,pending=0,failures=0,calls=0;
  const rows=db.transactions.filter(t=>t.currency!=='HKD'&&t.currency!=='UNKNOWN'&&t.fxStatus!=='converted')
    .filter(t=>force||!t.fxLastAttemptAt||(Date.now()-Date.parse(t.fxLastAttemptAt)>6*3600*1000))
    .reverse(); // New transactions first, rather than repeatedly hitting older failing FX pairs.
  for(const t of rows){
    if(calls>=maxCalls)break;
    calls++;t.fxLastAttemptAt=new Date().toISOString();
    try{
      const r=await getFXRate(t.currency,t.date);
      t.amountHKD=Math.round((t.amount*r.rate+Number.EPSILON)*100)/100;
      t.fxRate=r.rate;t.fxDate=r.date;t.fxSource=r.source;t.fxStatus='converted';
      converted++;
      save(); // Save each result, including after partial network failures.
    }catch(e){
      failures++;
      t.fxStatus='pending';save();
      console.warn('FX waiting for retry: '+t.currency+' '+(t.date||'latest')+' '+String(e));
    }
  }
  pending=db.transactions.filter(t=>t.fxStatus==='pending').length;
  return {converted,pending,failures};
}

function save() {
  const serialized=JSON.stringify(db,null,2);
  // Write a recovery copy before replacing an existing file. This is not an
  // atomic transaction; frequent iCloud/export backups are still recommended.
  if(fm.fileExists(dbPath)) fm.writeString(fm.joinPath(root,'transactions.previous.json'),fm.readString(dbPath));
  fm.writeString(dbPath,serialized);
}
function addRows(rows) {
  const existing=new Set(db.transactions.map(x=>x.id));
  let added=0, skipped=0;
  const insertedRows=[];
  for(const t of giveIds(rows)) {
    if(existing.has(t.id)){skipped++;continue;}
    ensureFxFields(t);db.transactions.push(t);existing.add(t.id);added++;
    insertedRows.push(t);
  }
  if(added) save();
  return {added,skipped,insertedRows,missingDate:db.transactions.filter(t=>!t.date).length, unknownCurrency:db.transactions.filter(t=>t.currency==='UNKNOWN').length};
}
function sum(rows){return Math.round(rows.reduce((a,t)=>a+(t.amountHKD||0),0)*100)/100;}
function hk(rows){return rows.filter(t=>validDate(t.date)&&Number.isFinite(t.amountHKD));}
function toMoney(n){return 'HK$'+Number(n||0).toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2});}
function monthStart(d){return d.slice(0,7);}
function monthsBack(n){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-n);return `${d.getFullYear()}-${z(d.getMonth()+1)}`;}
function dayBack(n){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-n);return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;}
function groupSum(rows,keyFn){const r={};for(const t of rows){const key=keyFn(t);r[key]=(r[key]||0)+(t.amountHKD||0);}return r;}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmt(n){return Number(n||0).toLocaleString('en-HK',{maximumFractionDigits:0});}
function barsSVG(items, width=640, height=185, color='#47b6ff') {
  const max=Math.max(1,...items.map(x=>Math.max(0,x.value)));
  const pad=15, bottom=28, top=16, gap=8;
  const unit=(width-2*pad)/Math.max(1,items.length);
  const barW=Math.max(3,unit-gap), chartH=height-bottom-top;
  let s=`<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="支出柱狀圖">`;
  s+=`<line x1="${pad}" y1="${height-bottom}" x2="${width-pad}" y2="${height-bottom}" stroke="#334155"/>`;
  items.forEach((v,i)=>{
    const val=Math.max(0,v.value), h=(val/max)*chartH;
    const x=pad+i*unit+(unit-barW)/2,y=height-bottom-h;
    s+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${color}"><title>${esc(v.label)}：${fmt(v.value)}</title></rect>`;
    if(items.length<=8 || i%2===0)s+=`<text x="${(x+barW/2).toFixed(1)}" y="${height-7}" fill="#9cacc2" font-size="${items.length>10?11:13}" text-anchor="middle">${esc(v.label)}</text>`;
  });
  return s+'</svg>';
}
function pieSVG(entries) {
  const colors=['#47b6ff','#9b8cff','#34d399','#fbba55','#fa7894','#5fdddc','#9ca3af'];
  const safe=entries.filter(v=>v[1]>0);
  const total=safe.reduce((a,x)=>a+x[1],0);
  if(!total)return '<p class="muted">暫無分類支出</p>';
  let x=0;
  const gradient=safe.map((r,i)=>{const start=x;x+=r[1]/total*100;return `${colors[i%colors.length]} ${start}% ${x}%`;}).join(',');
  return `<div class="donutrow"><div class="donut" style="background:conic-gradient(${gradient})"><div class="hole">分類<br><b>${safe.length}</b></div></div><div class="legend">${safe.map((r,i)=>`<div><span class="dot" style="background:${colors[i%colors.length]}"></span><span>${esc(r[0])}</span><b>${Math.round(r[1]/total*100)}%</b></div>`).join('')}</div></div>`;
}
function dashboardHTML(flash=''){
  const list=hk(db.transactions), now=today(), currentMonth=monthStart(now);
  const mList=list.filter(t=>monthStart(t.date)===currentMonth);
  const lastMonth=list.filter(t=>monthStart(t.date)===monthsBack(1));
  const daily=Array.from({length:14},(_,i)=>({date:dayBack(13-i)}));
  const dailyTotals=groupSum(list,t=>t.date);
  const days=daily.map(d=>({label:d.date.slice(8),value:dailyTotals[d.date]||0}));
  const months=Array.from({length:6},(_,i)=>monthsBack(5-i));
  const monthlyTotals=groupSum(list,t=>monthStart(t.date));
  const monthly=months.map(m=>({label:m.slice(5)+'月',value:monthlyTotals[m]||0}));
  const categoryEntries=Object.entries(groupSum(mList,t=>t.category)).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  const merchantEntries=Object.entries(groupSum(mList,t=>t.merchant)).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const monthTotal=sum(mList), prevTotal=sum(lastMonth), todayTotal=sum(list.filter(t=>t.date===now));
  const diff=prevTotal ? ((monthTotal-prevTotal)/Math.abs(prevTotal)*100).toFixed(1)+'%' : '—';
  const missing=db.transactions.filter(t=>!t.date).length;
  const uncertain=db.transactions.filter(t=>t.currency==='UNKNOWN').length;
  const fxPending=db.transactions.filter(t=>t.fxStatus==='pending').length;
  const recent=db.transactions.map((t,index)=>({t,index})).sort((a,b)=>(b.t.transactionTime||b.t.date||b.t.createdAt||'').localeCompare(a.t.transactionTime||a.t.date||a.t.createdAt||''));
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Expense Tracker</title>
  <style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'PingFang HK',sans-serif;background:#0d1422;color:#ecf3ff;margin:0;padding:24px 16px 60px}.wrap{max-width:860px;margin:auto}h1{font-size:27px;margin:0}h2{font-size:17px;margin:0 0 16px}.muted{color:#9cacc2}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.eyebrow{font-size:12px;color:#6bbdff;letter-spacing:1px;font-weight:700}.chips{display:flex;gap:8px;flex-wrap:wrap}.chip{background:#203047;border-radius:999px;padding:7px 10px;color:#b8c9e2;font-size:12px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{background:#172338;border:1px solid #25334c;border-radius:18px;padding:17px;margin-bottom:12px}.stat{font-size:clamp(22px,5vw,32px);font-weight:750;margin:8px 0 3px}.label{font-size:12px;color:#a9bad2}.sub{font-size:12px;color:#9cacc2}.chart{width:100%;display:block}.chart svg{width:100%;height:auto}.donutrow{display:flex;gap:25px;align-items:center}.donut{width:150px;height:150px;flex-shrink:0;border-radius:50%;display:grid;place-items:center}.hole{width:96px;height:96px;background:#172338;border-radius:50%;display:grid;place-content:center;text-align:center;font-size:12px;color:#9cacc2}.hole b{font-size:20px;color:white}.legend{flex:1;min-width:0}.legend>div{display:flex;gap:9px;align-items:center;margin:9px 0;font-size:12px}.legend span:nth-child(2){flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dot{height:10px;width:10px;border-radius:3px;display:inline-block;flex-shrink:0}.merchant{margin:12px 0}.merchanthead{display:flex;justify-content:space-between;font-size:13px;gap:12px}.merchanthead span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rail{height:7px;background:#25334c;border-radius:99px;margin-top:7px;overflow:hidden}.fill{height:100%;background:#47b6ff;border-radius:99px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:9px 6px;border-bottom:1px solid #25334c;text-align:left}th{color:#9cacc2;font-weight:500}td:last-child{text-align:right;white-space:nowrap}.scroll{overflow-x:auto}.negative{color:#34d399}.warn{color:#ffbd66}.footer{color:#7587a5;font-size:12px;text-align:center;margin:16px 0}@media(max-width:370px){.donutrow{gap:10px}.donut{width:118px;height:118px}.hole{width:76px;height:76px}} .tx-search{display:block;width:100%;margin:8px 0 12px;padding:11px 12px;border-radius:12px;background:#0d1422;color:#ecf3ff;border:1px solid #40516d;font-size:15px}.tx-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.edit-link{display:inline-block;padding:8px 11px;border-radius:9px;background:#244b78;color:#dcedff;text-decoration:none;white-space:nowrap;font-size:12px;font-weight:650}.edit-link:active{background:#3476ba}.save-flash{background:#174d3d;border:1px solid #2e9475;color:#d1ffeb;border-radius:12px;padding:11px;margin:10px 0}.tx-row[hidden]{display:none}.tx-hint{font-size:12px;color:#9cacc2;margin:9px 0 0}.manual-link-row{display:flex;align-items:center;gap:8px}.manual-link{white-space:nowrap;background:#2b5d89;color:#e8f4ff;border-radius:11px;text-decoration:none;padding:10px 11px;font-weight:700;font-size:13px}.tx-list{display:grid;gap:9px}.tx-swipe-shell{position:relative;overflow:hidden;border-radius:13px;background:#18283d;isolation:isolate}.tx-swipe-shell[hidden]{display:none}.tx-swipe-action{position:absolute;inset:0 0 0 auto;width:96px;background:#d93647;display:flex;align-items:stretch;justify-content:stretch}.tx-delete{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:96px;color:#fff;text-decoration:none;font-weight:700;font-size:13px}.tx-delete:focus-visible,.tx-more:focus-visible{outline:2px solid white;outline-offset:-4px}.tx-swipe-front{display:flex;align-items:center;gap:10px;min-height:76px;padding:11px 10px 11px 13px;position:relative;z-index:1;background:#1b2b42;transform:translateX(0);transition:transform .18s ease;touch-action:pan-y}.tx-swipe-shell.is-open .tx-swipe-front{transform:translateX(-96px)}.tx-main{flex:1;min-width:0}.tx-line{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.tx-merchant{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:650}.tx-value{font-size:15px;font-weight:750;white-space:nowrap}.tx-meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:5px;font-size:11px;color:#9cacc2}.tx-more{background:#223b58;color:#bcd2ef;border:0;border-radius:9px;min-width:27px;min-height:36px;font-size:21px;cursor:pointer}.tx-swipe-shell .edit-link{font-size:12px;padding:9px 10px}.tx-empty{padding:18px;color:#9cacc2;text-align:center}@media(max-width:370px){.tx-swipe-front{gap:6px;padding-left:9px}.tx-swipe-shell .edit-link{padding:8px 7px}.tx-value{font-size:13px}}</style></head><body><div class="wrap">
  <div class="top"><div><div class="eyebrow">EXPENSE TRACKER · HKD</div><h1>記帳儀表板</h1></div><div class="manual-link-row"><a class="manual-link" href="https://expense-editor.invalid/manual-open">＋ 手動記帳</a><span class="chip">${esc(now)}</span></div></div>
  ${flash?'<div class="save-flash">'+esc(flash)+'</div>':''}
  <div class="chips"><span class="chip">已儲存 ${db.transactions.length} 筆</span><span class="chip">日期待核對 ${missing}</span><span class="chip">貨幣待核對 ${uncertain}</span><span class="chip">匯率待換算 ${fxPending}</span></div><div style="height:14px"></div>
  <div class="grid"><div class="card"><div class="label">本月淨支出</div><div class="stat">${toMoney(monthTotal)}</div><div class="sub">較上月 ${diff}</div></div><div class="card"><div class="label">今日淨支出</div><div class="stat">${toMoney(todayTotal)}</div><div class="sub">HKD + 已換算外幣</div></div></div>
  <div class="card"><h2>近 14 日每日淨支出</h2><div class="chart">${barsSVG(days)}</div></div>
  <div class="card"><h2>近 6 個月支出</h2><div class="chart">${barsSVG(monthly,640,185,'#a894ff')}</div></div>
  <div class="card"><h2>本月消費類別</h2>${pieSVG(categoryEntries.slice(0,6).concat(categoryEntries.length>6?[['其他',categoryEntries.slice(6).reduce((a,x)=>a+x[1],0)]]:[]))}</div>
  <div class="card"><h2>本月最多消費商戶</h2>${merchantEntries.length?merchantEntries.map(([name,n])=>`<div class="merchant"><div class="merchanthead"><span>${esc(name)}</span><b>${toMoney(n)}</b></div><div class="rail"><div class="fill" style="width:${Math.max(0,n/merchantEntries[0][1]*100)}%"></div></div></div>`).join(''):'<div class="muted">本月暫無紀錄</div>'}</div>
  <div class="card"><div class="tx-title"><h2>交易記錄</h2><span class="muted">${recent.length} 筆</span></div>
  <input class="tx-search" id="txSearch" type="search" placeholder="搜尋商戶、日期、類別、信用卡…" autocomplete="off" aria-label="搜尋交易">
  <div class="tx-list" id="txList">${recent.length?recent.map(({t,index})=>`<div class="tx-swipe-shell" data-row="${index}" data-filter="${esc([t.date||"",t.merchant||"",t.category||"",t.card||"",t.currency||""].join(" ").toLowerCase())}">
    <div class="tx-swipe-action"><a class="tx-delete" href="https://expense-editor.invalid/delete?row=${index}" aria-label="刪除第 ${index+1} 筆交易">🗑️<span>刪除</span></a></div>
    <div class="tx-swipe-front"><div class="tx-main">
      <div class="tx-line"><span class="tx-merchant">${esc(t.merchant)}</span><span class="tx-value ${t.amount<0?"negative":""}">${esc(t.currency)} ${Number(t.amount).toFixed(2)}</span></div>
      <div class="tx-meta"><span>${esc(t.transactionTime||t.date||"待核對")}</span><span>${esc(t.category||"未分類")}</span><span>${Number.isFinite(t.amountHKD)?toMoney(t.amountHKD):"HKD 待換算"}</span></div>
    </div><a class="edit-link" href="https://expense-editor.invalid/edit?row=${index}">✏️ 編輯</a><button class="tx-more" type="button" aria-label="顯示刪除操作" aria-expanded="false">⋯</button></div>
  </div>`).join(""):"<div class=\"tx-empty\">暫無交易</div>"}</div>
  <div class="tx-hint">向左滑動交易 → 顯示紅色「刪除」→ 點擊後確認。向右滑動可收起；「⋯」亦可開啟刪除按鈕。編輯及刪除只影響本機 Scriptable，唔會同步 Apple Numbers。</div></div>
  <script>(function(){
  var search=document.getElementById("txSearch");
  var cards=Array.prototype.slice.call(document.querySelectorAll(".tx-swipe-shell"));
  var opened=null;
  function reveal(card,yes){
    if(opened && opened!==card){
      opened.classList.remove("is-open");
      var old=opened.querySelector(".tx-more");
      if(old)old.setAttribute("aria-expanded","false");
    }
    card.classList.toggle("is-open",!!yes);
    var button=card.querySelector(".tx-more");
    if(button)button.setAttribute("aria-expanded",yes?"true":"false");
    opened=yes?card:null;
  }
  cards.forEach(function(card){
    var front=card.querySelector(".tx-swipe-front");
    var toggle=card.querySelector(".tx-more");
    var x=0,y=0,tracking=false,dragging=false,wasOpen=false;
    if(toggle)toggle.addEventListener("click",function(e){
      e.stopPropagation();reveal(card,!card.classList.contains("is-open"));
    });
    card.addEventListener("touchstart",function(e){
      if(e.touches.length!==1 || e.target.closest("a,button"))return;
      x=e.touches[0].clientX;y=e.touches[0].clientY;
      wasOpen=card.classList.contains("is-open");tracking=true;dragging=false;
    },{passive:true});
    card.addEventListener("touchmove",function(e){
      if(!tracking || e.touches.length!==1)return;
      var dx=e.touches[0].clientX-x,dy=e.touches[0].clientY-y;
      if(!dragging&&(Math.abs(dx)<10 || Math.abs(dx)<Math.abs(dy)*1.3))return;
      dragging=true;e.preventDefault();
      front.style.transition="none";
      front.style.transform="translateX("+Math.max(-96,Math.min(0,(wasOpen?-96:0)+dx))+"px)";
    },{passive:false});
    card.addEventListener("touchend",function(e){
      if(!tracking)return;tracking=false;
      var dx=e.changedTouches.length?e.changedTouches[0].clientX-x:0;
      var show=dragging?(wasOpen?dx<35:dx< -40):wasOpen;
      front.style.transition="";front.style.transform="";
      reveal(card,show);dragging=false;
    },{passive:true});
    card.addEventListener("touchcancel",function(){
      if(!tracking)return;tracking=false;dragging=false;
      front.style.transition="";front.style.transform="";reveal(card,wasOpen);
    },{passive:true});
  });
  if(search)search.addEventListener("input",function(){
    var q=search.value.trim().toLowerCase();
    cards.forEach(function(card){
      card.hidden=!card.getAttribute("data-filter").includes(q);
      if(card.hidden && card.classList.contains("is-open"))reveal(card,false);
    });
  });
  document.addEventListener("click",function(e){
    if(opened && !opened.contains(e.target))reveal(opened,false);
  });
  })();</script>
  <p class="footer">交易本機儲存 · 外幣只向 Frankfurter 傳送貨幣對與日期<br>HKD 圖表只計入日期有效且已換算的交易；匯率為參考值，退款以負數抵銷。</p>
  </div></body></html>`;
}
function applyDashboardEdit(rowIndex,snapshot,fields){
  if(!Number.isInteger(rowIndex)||rowIndex<0||!snapshot||rowIndex>=db.transactions.length ||
    JSON.stringify(db.transactions[rowIndex])!==JSON.stringify(snapshot))throw new Error('交易索引無效或已變更，請重新開啟 Dashboard');
  const inputDate=String(fields.dateTime||'').trim();
  if(inputDate&&!/^(20\d{6}_\d{6}|20\d{2}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2})?)$/.test(inputDate))throw new Error('日期格式：YYYY-MM-DD 或 YYYYMMDD_HHMMSS');
  const date=inputDate?dateText(inputDate):null,transactionTime=inputDate?timestampText(inputDate):null;
  if(inputDate&&!date)throw new Error('無效日期／時間');
  if((inputDate.includes('_')||/[T ]\d{2}:\d{2}:\d{2}$/.test(inputDate))&&!transactionTime)throw new Error('時間必須係有效 HH:MM:SS');
  const amount=moneyValue(fields.amount);
  if(amount===null)throw new Error('金額必須係有效非零數字（負數退款允許）');
  const currency=currencyFrom(fields.currency)||'UNKNOWN';
  const merchant=String(fields.merchant||'').trim()||'未提供商戶';
  const category=String(fields.category||'').trim()||'未分類';
  const card=String(fields.card||'').trim();
  if(!fm.fileExists(dbPath))throw new Error('找不到交易資料庫');
  const latest=JSON.parse(fm.readString(dbPath));
  if(!latest||!Array.isArray(latest.transactions))throw new Error('交易資料庫格式無效');
  const matchIndex=snapshot.id?latest.transactions.findIndex(t=>t.id===snapshot.id):rowIndex;
  const diskRow=latest.transactions[matchIndex];
  if(!diskRow)throw new Error('交易已不存在，請重新打開 Dashboard');
  if(JSON.stringify(diskRow)!==JSON.stringify(snapshot))throw new Error('交易已被其他操作修改；請重新開啟 Dashboard，避免覆蓋較新版本');
  const updated={...diskRow,date,transactionTime,merchant,category,originalCategory:category,card,currency,amount};
  const changed=['date','transactionTime','merchant','category','card','currency','amount'].some(k=>diskRow[k]!==updated[k]);
  if(!changed)return false;
  if(diskRow.amount!==amount||diskRow.currency!==currency||diskRow.date!==date){
    updated.fxStatus='pending';updated.amountHKD=null;updated.fxRate=null;
    updated.fxDate=null;updated.fxSource=null;updated.fxLastAttemptAt=null;ensureFxFields(updated);
  }
  updated.editedAt=new Date().toISOString();
  latest.transactions[matchIndex]=updated;
  const previous=db;db=latest;
  try{
    save();
    const written=JSON.parse(fm.readString(dbPath));
    if(JSON.stringify(written.transactions[matchIndex])!==JSON.stringify(updated))throw new Error('無法讀回核實修改，請檢查資料庫');
  }catch(error){db=previous;throw error;}
  return true;
}
function deleteDashboardTransaction(rowIndex,snapshot){
  if(!Number.isInteger(rowIndex)||rowIndex<0||!snapshot||
    rowIndex>=db.transactions.length ||
    JSON.stringify(db.transactions[rowIndex])!==JSON.stringify(snapshot)){
    throw new Error('交易索引無效或畫面已過時，請重新開啟 Dashboard');
  }
  if(!fm.fileExists(dbPath))throw new Error('交易資料庫不存在');
  const latest=JSON.parse(fm.readString(dbPath));
  if(!latest||!Array.isArray(latest.transactions))throw new Error('交易資料庫格式異常');
  let index=rowIndex;
  if(snapshot.id){
    const matches=[];
    latest.transactions.forEach((t,i)=>{if(t.id===snapshot.id)matches.push(i);});
    if(matches.length!==1)throw new Error('交易 ID 不存在或重複，已拒絕刪除');
    index=matches[0];
  }
  if(!latest.transactions[index] ||
    JSON.stringify(latest.transactions[index])!==JSON.stringify(snapshot)){
    throw new Error('交易已被其他操作修改；為避免誤刪，請重新開啟 Dashboard');
  }
  latest.transactions.splice(index,1);
  const previous=db;db=latest;
  try{
    save(); // Existing save() writes transactions.previous.json first.
    const verified=JSON.parse(fm.readString(dbPath));
    if(!verified||!Array.isArray(verified.transactions) ||
      JSON.stringify(verified.transactions)!==JSON.stringify(latest.transactions)){
      throw new Error('刪除後讀回核實失敗，請檢查交易資料庫');
    }
  }catch(e){db=previous;throw e;}
  return true;
}
async function showDashboardDelete(rowIndex,web=null){
  const current=db.transactions[rowIndex];
  if(!current){await note('交易不存在','請重新開啟 Dashboard');return false;}
  const snapshot=JSON.parse(JSON.stringify(current));
  const confirm=new Alert();confirm.title='刪除呢筆交易？';
  confirm.message=(current.date||'無日期')+'  '+(current.merchant||'未提供商戶')+
    '\n'+(current.currency||'')+' '+Number(current.amount).toFixed(2)+
    '\n\n刪除後重新計算圖表；本機上一版備份仍會保留。Apple Numbers 已有行唔會同步刪除。';
  confirm.addDestructiveAction('刪除交易');confirm.addCancelAction('取消');
  if(await confirm.presentAlert()!==0)return false;
  try{
    deleteDashboardTransaction(rowIndex,snapshot);
    if(web)await web.loadHTML(dashboardHTML('✓ 已刪除交易；圖表及列表已更新'));
    else await note('刪除完成','本機交易已更新；其他交易保留。');
    return true;
  }catch(e){await note('刪除失敗',String(e.message||e));return false;}
}
async function selectDashboardTransactionToDelete(){
  const rows=db.transactions.map((t,index)=>({t,index})).sort((a,b)=>
    String(b.t.transactionTime||b.t.date||b.t.createdAt||'').localeCompare(
      String(a.t.transactionTime||a.t.date||a.t.createdAt||''))).slice(0,20);
  if(!rows.length){await note('暫無交易','沒有可以刪除的交易');return;}
  const menu=new Alert();menu.title='選擇要刪除嘅交易';
  rows.forEach(({t})=>menu.addAction((t.date||'無日期')+' '+String(t.merchant||'').slice(0,16)+' '+t.amount+' '+t.currency));
  menu.addCancelAction('取消');
  const chosen=await menu.presentSheet();
  if(chosen>=0&&chosen<rows.length)await showDashboardDelete(rows[chosen].index);
}
async function showDashboardEditor(rowIndex,web=null){
  const current=db.transactions[rowIndex];
  if(!current){await note('交易不存在','交易可能已改動，請重新打開 Dashboard');return false;}
  const snapshot=JSON.parse(JSON.stringify(current));
  const form=new Alert();form.title='✏️ 編輯交易';
  form.message='修改本機交易；日期可留空，但唔會計入日期圖表。';
  form.addTextField('日期／時間',current.transactionTime||current.date||'');
  form.addTextField('商戶',current.merchant||'');
  form.addTextField('類別',current.category||'');
  form.addTextField('貨幣（HKD／USD…）',current.currency==='UNKNOWN'?'':current.currency);
  form.addTextField('金額（負數代表退款）',String(current.amount));
  form.addTextField('卡名',current.card||'');
  form.addAction('儲存修改');form.addCancelAction('取消');
  if(await form.presentAlert()!==0)return false;
  const fields={dateTime:form.textFieldValue(0),merchant:form.textFieldValue(1),
    category:form.textFieldValue(2),currency:form.textFieldValue(3),
    amount:form.textFieldValue(4),card:form.textFieldValue(5)};
  try{
    const changed=applyDashboardEdit(rowIndex,snapshot,fields);
    if(changed&&web)await web.loadHTML(dashboardHTML('✓ 修改已儲存；圖表已重新計算'));
    else if(changed)await note('修改完成','已更新本機 transactions.json；重新打開 Dashboard 可查看最新圖表。');
    return changed;
  }catch(e){await note('修改失敗',String(e.message||e));return false;}
}
async function selectDashboardTransaction(){
  const rows=db.transactions.map((t,index)=>({t,index})).sort((a,b)=>
    String(b.t.transactionTime||b.t.date||b.t.createdAt||'').localeCompare(String(a.t.transactionTime||a.t.date||a.t.createdAt||''))).slice(0,20);
  if(!rows.length){await note('沒有交易','資料庫冇交易可編輯');return;}
  const menu=new Alert();menu.title='選擇交易編輯';
  rows.forEach(({t})=>menu.addAction((t.date||'無日期')+' '+String(t.merchant||'').slice(0,16)+' '+t.amount+' '+t.currency));
  menu.addCancelAction('取消');
  const chosen=await menu.presentSheet();
  if(chosen>=0&&chosen<rows.length)await showDashboardEditor(rows[chosen].index);
}
// Manual visual entry — fully local; no card data in URLs.
const MANUAL_CATEGORIES=[
  {
    "id": "餐飲",
    "label": "飲食",
    "color": "#ff9816",
    "icon": "utensils"
  },
  {
    "id": "日用品",
    "label": "日用品",
    "color": "#26c970",
    "icon": "bottle"
  },
  {
    "id": "衣服",
    "label": "衣服",
    "color": "#426dff",
    "icon": "shirt"
  },
  {
    "id": "娛樂",
    "label": "娛樂",
    "color": "#f6ca20",
    "icon": "game"
  },
  {
    "id": "水電",
    "label": "水電",
    "color": "#12c8f4",
    "icon": "drop"
  },
  {
    "id": "交通",
    "label": "交通",
    "color": "#c58056",
    "icon": "train"
  },
  {
    "id": "投資",
    "label": "投資",
    "color": "#f5a70b",
    "icon": "coin"
  },
  {
    "id": "旅行",
    "label": "旅行",
    "color": "#c8f354",
    "icon": "plane"
  },
  {
    "id": "醫療",
    "label": "醫療",
    "color": "#51dba1",
    "icon": "medical"
  },
  {
    "id": "訂閱",
    "label": "訂閱",
    "color": "#15d6fa",
    "icon": "credit"
  },
  {
    "id": "進修",
    "label": "進修",
    "color": "#f083b7",
    "icon": "book"
  },
  {
    "id": "運動",
    "label": "運動",
    "color": "#f4d54e",
    "icon": "dumbbell"
  }
];
function manualIconSVG(name,color) {
  const paths={
    utensils:'<path d="M4 3v7m3-7v7m3-7v7M7 10v11M4 10h6M17 3v18M17 3c-6 2-5 8 0 8"/>',
    bottle:'<path d="M10 3h4m-4 3h4M9 6h6v3l2 3v9H7v-9l2-3V6zm3 7c-2 2-2 4 0 5 2-1 2-3 0-5z"/>',
    shirt:'<path d="M9 4c1 2 5 2 6 0l5 3 2 5-4 2-2-3v10H8V11l-2 3-4-2 2-5 5-3z"/>',
    game:'<path d="M7 8h10c3 0 4 2 5 8l-3 2-4-4H9l-4 4-3-2c1-6 2-8 5-8zM8 10v5M5.5 12.5h5M16 11h.01M19 13h.01"/>',
    drop:'<path d="M12 2C10 6 5 10 5 15a7 7 0 0 0 14 0c0-5-5-9-7-13zM9 16a3 3 0 0 0 3 3"/>',
    train:'<rect x="5" y="3" width="14" height="17" rx="4"/><path d="M5 11h14M8 20l-2 2m10-2 2 2M9 15h.01M15 15h.01"/>',
    coin:'<circle cx="12" cy="12" r="9"/><path d="M14.7 8H10a2.2 2.2 0 0 0 0 4.4h3.5a2.2 2.2 0 0 1 0 4.4H9M12 6v12"/>',
    plane:'<path d="M22 3 9 10l-7-2 2 4 5 2 2 7 3-2-1-7 9-9z"/>',
    medical:'<rect x="3" y="6" width="18" height="15" rx="3"/><path d="M9 6V4h6v2M12 10v7M8.5 13.5h7"/>',
    credit:'<rect x="2" y="5" width="20" height="15" rx="3"/><path d="M2 10h20M6 16h5"/>',
    book:'<path d="M12 7c-4-3-7-3-10-2v14c4-1 7 0 10 3 3-3 6-4 10-3V5c-3-1-6-1-10 2zM12 7v15"/>',
    dumbbell:'<path d="M3 8v8m3-11v14m12-14v14m3-11v8M6 12h12M2 7h2v10H2m18-10h2v10h-2"/>'
  };
  return '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" fill="none" stroke="'+color+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+paths[name]+'</svg>';
}

function manualFormHTML(nonce,flash='') {
  const catHTML=MANUAL_CATEGORIES.map((x,i)=>
    '<button class="category'+(i===0?' selected':'')+'" type="button" data-category="'+x.id+'" aria-pressed="'+(i===0?'true':'false')+'">'+manualIconSVG(x.icon,x.color)+'<span>'+x.label+'</span></button>'
  ).join('');
  const d=today(),clock=new Date();
  const nowTime=z(clock.getHours())+':'+z(clock.getMinutes());
  const scriptJS=String.raw`(function(){
    const form=document.getElementById('manualForm');
    const date=document.getElementById('manualDate');
    const err=document.getElementById('manualError');
    const save=document.getElementById('manualSave');
    const categories=Array.from(document.querySelectorAll('.category'));
    function updateDateTitle(){
      const d=new Date(date.value+'T12:00:00');
      if(isNaN(d.getTime()))return;
      document.getElementById('dateTitle').textContent=
        new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(d);
    }
    function day(delta){
      const v=new Date(date.value+'T12:00:00');
      if(isNaN(v.getTime()))return;
      v.setDate(v.getDate()+delta);
      date.value=v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
      updateDateTitle();
    }
    document.getElementById('dateBack').addEventListener('click',()=>day(-1));
    document.getElementById('dateNext').addEventListener('click',()=>day(1));
    // Native iOS date picker is triggered by a transparent input over the date label.
    // Do not use showPicker() here: WKWebView support differs between iOS releases.
    date.addEventListener('change',updateDateTitle);
    updateDateTitle();
    categories.forEach(button=>button.addEventListener('click',()=>{
      categories.forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});
      button.classList.add('selected');button.setAttribute('aria-pressed','true');
      document.getElementById('manualCategory').value=button.getAttribute('data-category');
      err.textContent='';
    }));
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(save.disabled)return;
      const raw=document.getElementById('manualAmount').value.trim().replace(/,/g,'');
      const amount=Number(raw);
      if(!date.value || !document.getElementById('manualCategory').value){
        err.textContent='請選擇日期及分類';return;
      }
      if(!raw || !/^[+-]?\d+(?:\.\d+)?$/.test(raw) ||
         !Number.isFinite(amount) || amount===0){
        err.textContent='金額必須係有效非零數字，負數可作退款';return;
      }
      err.textContent='';save.disabled=true;save.textContent='儲存中…';
      // All values stay in the local WebView. URL carries NO transaction details.
      window.location.href='https://expense-editor.invalid/manual-save';
    });
  })();`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>手動記帳</title>
<style>
:root{color-scheme:dark;--page:#14171b;--panel:#282d34;--border:#393f47;--label:#aab4c0;--text:#f6f8fb}
*{box-sizing:border-box}
html{background:var(--page);-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang HK",sans-serif;background:var(--page);color:var(--text);margin:0;font-size:15px}
button,input,select{font:inherit}
button{cursor:pointer;-webkit-tap-highlight-color:transparent}
.screen{max-width:600px;margin:0 auto;padding:0 16px 104px;padding-top:max(102px,calc(env(safe-area-inset-top,0px) + 56px))}
.header{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;margin-bottom:10px}
.header-heading{min-width:0;display:flex;flex-direction:column;gap:1px}
.header h1{font-size:21px;line-height:1.24;font-weight:750;letter-spacing:0;margin:0}
.sub{font-size:11px;color:#9ca7b5}
.nav{display:inline-flex;align-items:center;justify-content:center;min-height:40px;white-space:nowrap;text-decoration:none;border-radius:11px;color:#d8e7f7;background:#262f39;border:1px solid #394757;padding:7px 11px;font-size:12px}
.success{background:#163c30;border:1px solid #2d9873;color:#bbffde;padding:10px 12px;border-radius:12px;margin:8px 0;font-size:13px}
.field-line{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border);padding:9px 0;min-height:61px}
.field-line>label{flex:0 0 51px;font-size:17px;font-weight:650;white-space:nowrap}
.center,.moneyline{flex:1;min-width:0}
.date-row{min-height:66px}
.date-controls{display:flex;align-items:center;gap:5px;width:100%;min-width:0}
.arrow{background:transparent;border:0;color:#e7edf8;font-size:26px;flex:0 0 31px;height:45px;padding:0;line-height:1}
.date-button{position:relative;display:flex;justify-content:center;align-items:center;flex:1;min-width:0;min-height:47px;background:#2c3239;color:#fff;border:1px solid #3b444e;border-radius:11px;font-size:15px;font-weight:700;padding:9px 5px;overflow:hidden}
#dateTitle{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;pointer-events:none}
#manualDate{position:absolute;inset:0;z-index:1;width:100%;height:100%;opacity:0;cursor:pointer;margin:0;border:0;padding:0}
.line-input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#fff;font-size:16px;padding:5px 0;min-height:41px}
.line-input::placeholder{color:#8994a2}
.moneyline{display:flex;align-items:center;gap:9px;width:100%}
.currency{flex:0 0 76px;width:76px;min-height:47px;background:#2b3139;color:#f3f7fc;border:1px solid #3a4652;border-radius:10px;padding:0 5px;font-size:14px}
.amount{flex:1;width:100%;min-width:0;height:54px;border:1px solid #39434d;outline:0;background:#2b3138;color:#fff;border-radius:12px;padding:7px 12px;font-size:27px;font-weight:720;font-variant-numeric:tabular-nums}
.amount::placeholder{color:#98a1aa}
.options{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin:12px 0 0}
.option{min-width:0}
.option label{display:block;margin:0 0 6px;color:var(--label);font-size:12px}
.option input{display:block;width:100%;min-width:0;min-height:45px;max-width:100%;background:#282e35;color:#fff;border:1px solid #424b57;border-radius:11px;padding:7px 11px;font-size:14px}
.option input[type=time]{-webkit-appearance:none;appearance:none}
h2{font-size:17px;line-height:1.25;margin:17px 0 11px;font-weight:720}
.categories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.category{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;min-width:0;min-height:88px;border:1px solid #424952;border-radius:12px;background:#181c21;color:#fff;font-size:14px;padding:9px 4px}
.category.selected{border:2px solid #d6e2f0;background:#262d35;box-shadow:inset 0 0 0 1px #8e9fac}
.category span{line-height:1.15}
.category svg{width:32px;height:32px;flex-shrink:0}
.bottom{position:fixed;bottom:0;left:0;right:0;padding:9px max(16px,env(safe-area-inset-left)) max(12px,env(safe-area-inset-bottom));background:rgba(28,31,36,.98);border-top:1px solid #353a43;z-index:10}
.submit{display:block;width:100%;max-width:570px;margin:0 auto;min-height:54px;border-radius:28px;background:#797f86;color:white;border:1px solid #a2a9b1;font-size:18px;font-weight:730}
.submit:disabled{opacity:.6}
.error{color:#ff9aa1;font-size:12px;min-height:14px;margin:8px 0 0}
.hint{color:#9ba5b2;font-size:11px;line-height:1.4;margin:14px 0 0}
@media(max-width:365px){.screen{padding-left:11px;padding-right:11px}.field-line{gap:8px}.field-line>label{flex-basis:45px}.date-button{font-size:13px}.arrow{flex-basis:26px}.currency{flex-basis:69px;width:69px}.options{gap:9px}.category{min-height:80px}}
@media(min-width:600px){.screen{padding-top:max(92px,calc(env(safe-area-inset-top,0px) + 45px))}.category{min-height:98px}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
</style></head><body><main class="screen">
<header class="header"><div class="header-heading"><h1>手動記帳</h1><span class="sub">非 Tap Card 交易 · 本機儲存</span></div><a class="nav" href="https://expense-editor.invalid/manual-back">‹ Dashboard</a></header>
${flash?'<div class="success">'+esc(flash)+'</div>':''}
<form id="manualForm" autocomplete="off">
<div class="field-line date-row"><label for="manualDate">日期</label><div class="center">
  <div class="date-controls"><button type="button" id="dateBack" class="arrow" aria-label="前一日">‹</button>
  <label id="datePicker" class="date-button" for="manualDate"><span id="dateTitle">選擇日期</span><input id="manualDate" type="date" value="${d}" required aria-label="交易日期"></label>
  <button type="button" id="dateNext" class="arrow" aria-label="後一日">›</button></div>
</div></div>
<div class="field-line"><label for="manualMerchant">記錄</label><div class="center"><input class="line-input" type="text" maxlength="120" id="manualMerchant" placeholder="商戶／備註（可留空）"></div></div>
<div class="field-line"><label for="manualAmount">支出</label><div class="moneyline">
  <select id="manualCurrency" class="currency" aria-label="貨幣">
  ${['HKD','USD','CNY','JPY','EUR','GBP','SGD','TWD','MOP','AUD'].map(c=>'<option value="'+c+'">'+c+'</option>').join('')}</select>
  <input id="manualAmount" class="amount" type="text" inputmode="decimal" placeholder="0" aria-label="金額" required></div></div>
<div class="options"><div class="option"><label for="manualTime">交易時間</label><input id="manualTime" type="time" value="${nowTime}"></div>
<div class="option"><label for="manualCard">付款方式</label><input id="manualCard" type="text" maxlength="80" value="現金" list="manualPaymentOptions">
<datalist id="manualPaymentOptions"><option value="現金"></option><option value="八達通"></option><option value="轉數快 FPS"></option><option value="銀行轉帳"></option><option value="信用卡（手動）"></option></datalist>
</div></div>
<h2>分類</h2><input type="hidden" id="manualCategory" value="餐飲">
<div class="categories">${catHTML}</div>
<p class="hint">只會記錄有效、非零金額；負數代表退款。外幣先以原幣儲存，之後可由主選單換算。Apple Numbers 已有資料列不會自動同步。</p>
<p id="manualError" class="error" role="alert"></p></form>
</main><div class="bottom"><button type="submit" form="manualForm" id="manualSave" class="submit">儲存支出</button></div>
<script>${scriptJS}</script></body></html>`;
}

function readManualFormWeb(web) {
  return web.evaluateJavaScript("(function(){var v=function(x){var el=document.getElementById(x);return el?String(el.value||''):'';};return {date:v('manualDate'),time:v('manualTime'),merchant:v('manualMerchant'),amount:v('manualAmount'),currency:v('manualCurrency'),card:v('manualCard'),category:v('manualCategory')};})()",false);
}

function saveManualForm(payload,nonce) {
  if(!payload||typeof payload!=='object')throw new Error('無法讀取手動表單');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date||''))||!validDate(payload.date))throw new Error('請選擇有效日期');
  const time=String(payload.time||'').trim();
  if(time&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('交易時間無效');
  const amount=moneyValue(payload.amount);
  if(amount===null)throw new Error('金額必須係有效非零數字（負數係退款）');
  const currency=String(payload.currency||'').trim().toUpperCase();
  if(!['HKD','USD','CNY','JPY','EUR','GBP','SGD','TWD','MOP','AUD'].includes(currency))throw new Error('不支援嘅幣種');
  const category=String(payload.category||'');
  if(!MANUAL_CATEGORIES.some(c=>c.id===category))throw new Error('請選擇有效分類');
  const merchant=String(payload.merchant||'').trim().slice(0,120);
  const card=String(payload.card||'').trim().slice(0,80);
  if(!/^\d{13,}-[0-9a-z]+$/.test(nonce))throw new Error('無效表單識別碼');
  const identity='manual-form:'+nonce;
  // Database is reloaded before writing so a concurrent Shortcut append is retained.
  let latest={version:1,transactions:[]};
  if(fm.fileExists(dbPath)){
    latest=JSON.parse(fm.readString(dbPath));
    if(!latest||!Array.isArray(latest.transactions))throw new Error('資料庫格式錯誤；未有修改資料');
  }
  if(latest.transactions.some(t=>t.id==='external:'+identity)){
    db=latest;return {status:'duplicate',amount,currency,merchant:merchant||'未提供商戶'};
  }
  const eventDate=payload.date+(time?'T'+time+':00':'');
  const rec=normalize({id:identity,date:eventDate,amount,currency,
    merchantName:merchant,merchantType:category,card,source:'Manual'});
  if(!rec)throw new Error('無法轉換手動記帳資料');
  // Explicit user-selected category wins over automatic merchant keywords.
  rec.category=category;rec.originalCategory=category;rec.source='Manual';
  const previous=db;db=latest;
  try{
    const result=addRows([rec]);
    if(result.added!==1)throw new Error('未有新增交易');
    const check=verifyStored(result.insertedRows);
    if(check.verified!==1)throw new Error('磁碟核實失敗');
  }catch(e){db=previous;throw e;}
  return {status:'saved',amount,currency,merchant:rec.merchant};
}

async function presentExpenseWeb(initial='dashboard') {
  const web=new WebView();
  let busy=false,nonce=String(Date.now())+'-'+Math.random().toString(36).slice(2,12);
  web.shouldAllowRequest=(request)=>{
    const url=String(request.url||'');
    const action=url.match(/^https:\/\/expense-editor\.invalid\/(edit|delete|manual-open|manual-save|manual-back)(?:\?row=(\d+))?$/);
    if(action){
      if(!busy){
        busy=true;
        (async()=>{
          if(action[1]==='edit'||action[1]==='delete'){
            const method=action[1]==='edit'?showDashboardEditor:showDashboardDelete;
            await method(Number(action[2]),web);
          }else if(action[1]==='manual-open'){
            nonce=String(Date.now())+'-'+Math.random().toString(36).slice(2,12);
            await web.loadHTML(manualFormHTML(nonce));
          }else if(action[1]==='manual-back'){
            await web.loadHTML(dashboardHTML());
          }else if(action[1]==='manual-save'){
            try{
              const data=await readManualFormWeb(web);
              const receipt=saveManualForm(data,nonce);
              nonce=String(Date.now())+'-'+Math.random().toString(36).slice(2,12);
              const msg=receipt.status==='duplicate'?'同一表單已記帳，冇重複新增':'✓ 已儲存 '+receipt.currency+' '+receipt.amount+' · '+receipt.merchant;
              await web.loadHTML(manualFormHTML(nonce,msg));
            }catch(e){
              const message=String(e.message||e).slice(0,180);
              await web.evaluateJavaScript("(function(){var b=document.getElementById('manualSave');if(b){b.disabled=false;b.textContent='儲存支出'};var e=document.getElementById('manualError');if(e)e.textContent="+JSON.stringify(message)+";})();",false);
            }
          }
        })().catch(e=>console.error('Expense WebView action: '+String(e))).finally(()=>{busy=false;});
      }
      return false;
    }
    // No user data is ever put in URLs; all HTTP navigation is blocked.
    if(/^https?:/i.test(url))return false;
    return true;
  };
  await web.loadHTML(initial==='manual'?manualFormHTML(nonce):dashboardHTML());
  await web.present(true);
}

// Stable app entry points. Keep these names: app() and deeplink routes call them.
async function dashboard(){return await presentExpenseWeb('dashboard');}
async function addManual(){return await presentExpenseWeb('manual');}

// --------------------------------------------------
// Adaptive widgets — Small / Medium / Large / iPad Extra Large.
// DrawContext only draws charts; native text & stacks remain scalable.
// --------------------------------------------------
const WC = {
  bg:'#101b2d', primary:'#f3f7ff', secondary:'#9fb2cd',
  blue:'#55baff', green:'#46d6a0', violet:'#ae9aff',
  track:'#263b55', muted:'#7f94b3', warn:'#ffc778'
};
function wText(parent,value,size=11,color=WC.secondary,bold=false){
  const t=parent.addText(String(value));
  t.font=bold?Font.semiboldSystemFont(size):Font.systemFont(size);
  t.textColor=new Color(color);
  t.lineLimit=1;
  t.minimumScaleFactor=0.65;
  return t;
}
function compactMoney(n){
  const v=Number(n)||0, a=Math.abs(v), sign=v<0?'-':'';
  if(a>=1000000)return sign+'HK$'+(a/1000000).toFixed(a>=10000000?1:2)+'m';
  if(a>=10000)return sign+'HK$'+(a/1000).toFixed(1)+'k';
  return sign+'HK$'+a.toLocaleString('en-HK',{maximumFractionDigits:2,minimumFractionDigits:2});
}
function compactCurrency(t){
  if(Number.isFinite(t.amountHKD))return compactMoney(t.amountHKD);
  return (t.currency==='UNKNOWN'?'?':t.currency)+' '+Number(t.amount).toFixed(2);
}
function widgetSummary(){
  const now=today(), valid=hk(db.transactions);
  const month=valid.filter(t=>monthStart(t.date)===monthStart(now));
  const byDay=groupSum(valid,t=>t.date);
  const monthlyCats=Object.entries(groupSum(month,t=>t.category))
    .filter(([_,value])=>value>0).sort((a,b)=>b[1]-a[1]);
  const recent=db.transactions.slice()
    .sort((a,b)=>String(b.transactionTime||b.date||b.createdAt||'')
      .localeCompare(String(a.transactionTime||a.date||a.createdAt||'')));
  const unresolved=db.transactions.filter(t=>!t.date || !Number.isFinite(t.amountHKD)).length;
  return {
    month:sum(month), today:byDay[now]||0, last7:sum(valid.filter(t=>t.date>=dayBack(6)&&t.date<=now)),
    txCount:month.length, unresolved, byDay, monthlyCats, recent,
  };
}
function chartPoints(byDay,count){
  return Array.from({length:count},(_,i)=>{
    const date=dayBack(count-1-i);
    return {label:date.slice(8),value:byDay[date]||0};
  });
}
// Signed bars: blue above zero, green refunds below zero. No fake minimum-height bars.
function makeBarChart(points,width,height,showLabels=true){
  const ctx=new DrawContext();
  ctx.size=new Size(width,height);ctx.respectScreenScale=true;ctx.opaque=false;
  const vals=points.map(x=>x.value), maxP=Math.max(0,...vals), maxN=Math.max(0,...vals.map(x=>-x));
  const top=5, bottom=showLabels?16:4, plotH=height-top-bottom;
  const hasNeg=maxN>0;
  const zeroY=hasNeg ? top+plotH*(maxP/(maxP+maxN||1)) : top+plotH;
  ctx.setFillColor(new Color(WC.track));
  ctx.fillRect(new Rect(0,zeroY,width,1));
  const unit=width/Math.max(1,points.length), barW=Math.max(2,Math.min(21,unit*0.57));
  for(let i=0;i<points.length;i++){
    const v=points[i].value;
    if(v!==0){
      const yEnd=v>0 ? zeroY-(v/Math.max(1,maxP))*(zeroY-top)
        : zeroY+(-v/Math.max(1,maxN))*(top+plotH-zeroY);
      ctx.setFillColor(new Color(v<0?WC.green:(i===points.length-1?WC.violet:WC.blue)));
      ctx.fillRect(new Rect(i*unit+(unit-barW)/2,Math.min(zeroY,yEnd),barW,Math.max(1,Math.abs(yEnd-zeroY))));
    }
    if(showLabels){
      const n=points.length;
      const shouldLabel=n<=7 || (n<=14 ? i%2===0 || i===n-1 : i%5===0 || i===n-1);
      if(shouldLabel){
        ctx.setFont(Font.mediumSystemFont(n>20?8:9));
        ctx.setTextColor(new Color(WC.secondary));
        ctx.setTextAlignedCenter();
        ctx.drawTextInRect(points[i].label,new Rect(i*unit-unit*0.15,height-13,unit*1.3,12));
      }
    }
  }
  return ctx.getImage();
}
function makeMiniBar(width,ratio,color=WC.blue){
  const ctx=new DrawContext();ctx.size=new Size(width,6);
  ctx.respectScreenScale=true;ctx.opaque=false;
  ctx.setFillColor(new Color(WC.track));ctx.fillRect(new Rect(0,0,width,6));
  if(ratio>0){ctx.setFillColor(new Color(color));ctx.fillRect(new Rect(0,0,Math.max(1,width*Math.min(1,ratio)),6));}
  return ctx.getImage();
}
function addChart(parent,points,width,height){
  const pic=parent.addImage(makeBarChart(points,width,height));
  pic.imageSize=new Size(width,height);
  pic.applyFittingContentMode();
  return pic;
}
function addCategoryRows(parent,items,maxRows,barWidth){
  if(!items.length){wText(parent,'暫無分類資料',10,WC.muted);return;}
  const max=Math.max(1,items[0][1]);
  items.slice(0,maxRows).forEach(([name,amount],i)=>{
    const row=parent.addStack();row.layoutHorizontally();row.centerAlignContent();row.spacing=5;
    const nameCol=row.addStack();nameCol.size=new Size(barWidth>105?118:104,0);
    wText(nameCol,String(name).slice(0,11),10,WC.primary);
    const track=row.addImage(makeMiniBar(barWidth,amount/max,
      [WC.blue,WC.violet,WC.green,WC.warn][i%4]));
    track.imageSize=new Size(barWidth,6);track.centerAlignImage();
    row.addSpacer();
    wText(row,compactMoney(amount),10,WC.secondary,true);
  });
}
function addRecentRows(parent,items,rows){
  if(!items.length){wText(parent,'暫無交易',10,WC.muted);return;}
  items.slice(0,rows).forEach(t=>{
    const row=parent.addStack();row.layoutHorizontally();row.centerAlignContent();row.spacing=4;
    const name=t.merchant==='未提供商戶'?'未提供商戶':t.merchant;
    const label=t.transactionTime?t.transactionTime.slice(11,16)+'  '+name:name;
    wText(row,label,10,WC.primary);
    row.addSpacer(3);
    wText(row,compactCurrency(t),10,t.amount<0?WC.green:WC.secondary,true);
  });
}
function widgetWidth(family){
  // Deliberately conservative: actual WidgetKit dimensions vary with device.
  let sw=390;
  try {sw=Device.screenSize().width||390;} catch(_){ }
  if(family==='small')return Math.max(103,Math.min(130,(sw-130)/2));
  if(family==='extraLarge')return Math.max(455,Math.min(670,sw-135));
  return Math.max(245,Math.min(355,sw-78));
}
function buildWidget(family=config.widgetFamily||'medium'){
  const s=widgetSummary(), w=new ListWidget();
  w.backgroundColor=new Color(WC.bg);
  w.spacing=0;
  const accessory=family.startsWith('accessory');
  w.setPadding(accessory?1:(family==='small'?9:11),accessory?2:13,accessory?1:(family==='small'?8:10),accessory?2:13);
  w.refreshAfterDate=new Date(Date.now()+30*60*1000);
  const url=URLScheme.forRunningScript();
  w.url=url+(url.includes('?')?'&':'?')+'view=dashboard';

  if(accessory){
    if(family==='accessoryInline'){
      wText(w,'本月 '+compactMoney(s.month),11,WC.primary,true);
    }else if(family==='accessoryCircular'){
      wText(w,compactMoney(s.month).replace('HK$','$'),12,WC.primary,true);
    }else{
      wText(w,'💳 本月 '+compactMoney(s.month),13,WC.primary,true);
      wText(w,'今日 '+compactMoney(s.today),10,WC.secondary);
    }
    return w;
  }

  const width=widgetWidth(family);
  const headline=w.addStack();headline.layoutHorizontally();headline.centerAlignContent();
  wText(headline,'💳  記帳分析',11,WC.secondary,true);
  headline.addSpacer();
  wText(headline,today().slice(5),10,WC.muted);
  w.addSpacer(4);

  if(family==='small'){
    wText(w,compactMoney(s.month),22,WC.primary,true);
    w.addSpacer(3);
    const sub=w.addStack();sub.layoutHorizontally();sub.centerAlignContent();
    wText(sub,'今日 '+compactMoney(s.today),10,WC.secondary);
    w.addSpacer(3);
    wText(w,'最近 7 日',10,WC.secondary,true);
    w.addSpacer(2);
    addChart(w,chartPoints(s.byDay,7),width,36);
    w.addSpacer(2);
    wText(w,s.txCount+' 筆本月交易'+(s.unresolved?' · '+s.unresolved+' 待核對':''),9,WC.muted);
    return w;
  }

  if(family==='medium'){
    const row=w.addStack();row.layoutHorizontally();row.centerAlignContent();row.spacing=7;
    const left=row.addStack();left.layoutVertically();left.spacing=3;
    left.size=new Size(Math.max(112,Math.min(144,width*.43)),0);
    wText(left,'本月淨支出',10,WC.secondary);
    wText(left,compactMoney(s.month),22,WC.primary,true);
    left.addSpacer(3);
    wText(left,'今日 '+compactMoney(s.today),11,WC.green,true);
    wText(left,'本月 '+s.txCount+' 筆',9,WC.muted);
    row.addSpacer();
    const right=row.addStack();right.layoutVertically();right.spacing=2;
    wText(right,'最近 14 日',10,WC.secondary,true);
    const chartW=Math.max(125,width-Math.max(112,Math.min(144,width*.43))-14);
    addChart(right,chartPoints(s.byDay,14),chartW,74);
    w.addSpacer();
    const foot=w.addStack();foot.layoutHorizontally();
    wText(foot,'近 7 日 '+compactMoney(s.last7),10,WC.secondary);
    foot.addSpacer();
    wText(foot,s.unresolved?s.unresolved+' 筆待核對':'已換算交易',9,s.unresolved?WC.warn:WC.muted);
    return w;
  }

  if(family==='large'){
    const metrics=w.addStack();metrics.layoutHorizontally();metrics.centerAlignContent();
    const main=metrics.addStack();main.layoutVertically();main.spacing=1;
    wText(main,'本月淨支出',10,WC.secondary);
    wText(main,compactMoney(s.month),26,WC.primary,true);
    metrics.addSpacer();
    const todayBox=metrics.addStack();todayBox.layoutVertically();todayBox.spacing=2;
    wText(todayBox,'今日',10,WC.muted);
    wText(todayBox,compactMoney(s.today),15,WC.green,true);
    w.addSpacer(8);
    wText(w,'最近 14 日 · 每日淨支出',11,WC.secondary,true);
    w.addSpacer(3);
    addChart(w,chartPoints(s.byDay,14),width,83);
    w.addSpacer(7);
    const catHead=w.addStack();catHead.layoutHorizontally();
    wText(catHead,'本月分類',11,WC.secondary,true);
    catHead.addSpacer();wText(catHead,s.txCount+' 筆',9,WC.muted);
    w.addSpacer(4);
    addCategoryRows(w,s.monthlyCats,4,Math.max(45,Math.min(92,width-235)));
    w.addSpacer(7);
    wText(w,'最近交易',11,WC.secondary,true);
    w.addSpacer(3);
    addRecentRows(w,s.recent,2);
    w.addSpacer();
    wText(w,s.unresolved?s.unresolved+' 筆日期或匯率待核對':'已記錄交易 · 點擊看詳細',9,s.unresolved?WC.warn:WC.muted);
    return w;
  }

  // iPad extraLarge: two meaningful columns and longer time window.
  wText(w,'本月 '+compactMoney(s.month)+'  ·  今日 '+compactMoney(s.today)+
    '  ·  '+s.txCount+' 筆本月交易',19,WC.primary,true);
  w.addSpacer(9);
  const cols=w.addStack();cols.layoutHorizontally();cols.spacing=17;
  const left=cols.addStack();left.layoutVertically();left.spacing=5;
  wText(left,'最近 30 日淨支出',12,WC.secondary,true);
  const leftWidth=Math.floor(width*.55);
  addChart(left,chartPoints(s.byDay,30),leftWidth,118);
  wText(left,'近 7 日 '+compactMoney(s.last7),11,WC.muted);
  const right=cols.addStack();right.layoutVertically();right.spacing=6;
  wText(right,'本月類別',12,WC.secondary,true);
  addCategoryRows(right,s.monthlyCats,6,Math.max(38,Math.min(75,width-leftWidth-245)));
  w.addSpacer(11);
  wText(w,'最近交易',12,WC.secondary,true);
  w.addSpacer(4);
  addRecentRows(w,s.recent,5);
  w.addSpacer();
  wText(w,s.unresolved?s.unresolved+' 筆待核對':'全部有日期及已換算交易 · 點擊睇 Dashboard',10,WC.muted);
  return w;
}
async function previewWidget(){
  const choices=['Small — 7日','Medium — 14日','Large — 分類 + 交易'];
  let isPad=false;try{isPad=Device.isPad();}catch(_){ }
  if(isPad)choices.push('Extra Large — iPad');
  const pick=new Alert();pick.title='預覽記帳 Widget';
  choices.forEach(x=>pick.addAction(x));pick.addCancelAction('取消');
  const i=await pick.presentSheet();if(i<0)return;
  const family=['small','medium','large','extraLarge'][i];
  const widget=buildWidget(family);
  if(i===0)await widget.presentSmall();
  if(i===1)await widget.presentMedium();
  if(i===2)await widget.presentLarge();
  if(i===3)await widget.presentExtraLarge();
}
async function note(title,msg){const a=new Alert();a.title=title;a.message=msg;a.addAction('確定');await a.presentAlert();}
// Privacy-preserving diagnostics: never echo raw Shortcut model output or card/merchant values.
function describeInput(input){
  if(input===null || input===undefined)return '沒有收到參數';
  if(Array.isArray(input))return '清單（'+input.length+' 個元素）';
  if(typeof input==='object'){
    const keys=Object.keys(input);
    return 'Dictionary；欄位：'+(keys.length?keys.slice(0,12).join(', '):'空白')+(keys.length>12?'…':'');
  }
  if(typeof input==='string'){
    const hasAmount=/(?:amount|transactionAmount|totalAmount|金額|付款金額)/i.test(input);
    return '文字（'+input.length+' 字，'+(hasAmount?'有':'找不到')+' amount 標籤）';
  }
  return '非預期類型：'+typeof input;
}
function amountHint(input){
  if(!input || typeof input!=='object' || Array.isArray(input))return '';
  const original=field(input,'Amount','amount','totalAmount','transactionAmount','金額','消費金額');
  const amount=moneyValue(original);
  if(amount!==null)return '；頂層金額 '+amount;
  if(original!==null)return '；頂層金額無效／為 0';
  return '；頂層找不到 amount';
}
// A receipt is returned ONLY after local transactions.json has been re-read and checked.
// Do not treat AI model output or a Shortcuts preview as a successful save.
function verifyStored(rows){
  if(!fm.fileExists(dbPath))throw new Error('未找到 transactions.json，無法確認入帳');
  const stored=JSON.parse(fm.readString(dbPath));
  if(!stored || !Array.isArray(stored.transactions))throw new Error('寫入後資料庫格式異常');
  const savedById=new Map(stored.transactions.map(t=>[t.id,t]));
  for(const t of rows){
    const record=savedById.get(t.id);
    if(!record || Number(record.amount)!==Number(t.amount) ||
      String(record.currency)!==String(t.currency) ||
      String(record.date||'')!==String(t.date||'')){
      throw new Error('交易未能喺磁碟讀回核實，請勿當成已成功記帳');
    }
  }
  return {verified:rows.length,total:stored.transactions.length};
}
// Scriptable saves the on-device JSON ledger; Apple Numbers is independent.
// This output is consumed by Shortcuts > Numbers > Add Row to Table.
// Only newly inserted rows are emitted: repeat imports do not append again.
// Note: local insertion and the later Numbers action are not atomic.
// If Numbers fails after local save, reconcile manually before retrying.
function toNumbersRow(t){
  return [t.transactionTime||t.date||'',t.card||'',t.merchant||'',t.category||'',
    t.currency==='UNKNOWN'?'':t.currency,t.amount];
}
function emitShortcutReceipt(receipt,status,inserted=[]){
  const rows=inserted.map(toNumbersRow);
  Script.setShortcutOutput({
    version:'3.11.2',status,receipt,
    shouldAppendNumbers:rows.length===1,
    requiresBatchSync:rows.length>1,
    numbersRow:rows.length===1?rows[0]:[],
    numbersRows:rows,
    numbersColumns:['Date','Card','MerchantName','MerchantType','Currency','Amount'],
    transactionId:inserted.length===1?inserted[0].id:'',
    localStored:status==='saved'||status==='duplicate'
  });
}
async function importData(input,ask){
  __expensePhase = '解析 Shortcuts 輸入';
  let received=describeInput(input)+amountHint(input);
  recordShortcutAttempt('received',{inputType:describeInput(input),hasShortcutParameter:input!==null&&input!==undefined});
  lastParseMethod='unknown';
  let rows=parseInput(input);
  let source='Shortcut Parameter';
  // Apple Shortcuts can supply a model response through the Texts field instead.
  if(!rows.length && Array.isArray(args.plainTexts)){
    for(const candidate of args.plainTexts){
      const next=parseInput(candidate);
      if(next.length){
        rows=next;source='Texts';
        received=describeInput(candidate)+amountHint(candidate);
        break;
      }
    }
  }
  if(!rows.length){
    const reason='未入帳：未找到有效非零 amount（可能模型冇輸出金額、輸出為 0，或格式仍不可解析）';
    const message='[EXPENSE-HK-v3.11.2] 未入帳\n'+reason+'\n接收來源：'+source+'\n接收：'+received+'\n解析：'+lastParseMethod+'\n沒有修改交易資料庫。';
    console.log('[ExpenseTrackerHK v3.11.2] '+reason+' | '+received);
    recordShortcutAttempt('skipped',{reason:'no valid nonzero amount',parser:lastParseMethod});
    emitShortcutReceipt(message,'skipped');
    if(ask && config.runsInApp)await note('沒有記帳',message);
    return;
  }
  if(ask && rows.length>1){
    const a=new Alert();a.title='確認匯入';
    a.message=`讀到 ${rows.length} 筆有有效金額的交易；${rows.filter(t=>!t.date).length} 筆缺日期。`;
    a.addAction('匯入');a.addCancelAction('取消');
    if(await a.presentAlert()===-1)return;
  }
  const amounts=rows.slice(0,5).map(t=>t.amount+' '+t.currency).join(', ');
  recordShortcutAttempt('parsed',{parser:lastParseMethod,source,validCount:rows.length});
  // Shortcuts must not block a HKD purchase on unrelated pending FX network calls.
  // Record on local disk and verify FIRST; run currency conversion later from the app.
  __expensePhase = '儲存交易';
  const result=addRows(rows);
  __expensePhase = '讀回核實 transactions.json';
  const check=verifyStored(rows);
  recordShortcutAttempt(result.added?'saved':'duplicate',{added:result.added,duplicates:result.skipped,verified:check.verified,total:check.total,parser:lastParseMethod,source});
  const pendingFX=db.transactions.filter(t=>t.fxStatus==='pending').length;
  __expensePhase = '回傳記帳結果';
  const status=result.added>0?'已儲存 '+result.added+' 筆':(result.skipped>0?'已存在 '+result.skipped+' 筆（沒有再次入帳）':'沒有新增交易');
  const message=`[EXPENSE-HK-v3.11.2] ${status}\n磁碟核實：${check.verified} 筆，資料庫現有 ${check.total} 筆\n接收來源：${source}\n接收：${received}\n解析：${lastParseMethod}\n識別金額：${amounts}\n待換算外幣：${pendingFX} 筆（不阻塞本次入帳）\n日期待核對 ${result.missingDate} 筆，貨幣待核對 ${result.unknownCurrency} 筆`;
  emitShortcutReceipt(message,result.added?'saved':(result.skipped?'duplicate':'skipped'),result.insertedRows);
  if(ask && config.runsInApp)await note('記帳完成',message);
}
async function review(){
  const list=db.transactions.filter(t=>!t.date||t.currency==='UNKNOWN');
  if(!list.length){await note('待核對','沒有缺日期或不明貨幣紀錄。');return;}
  const pick=new Alert();pick.title=`待核對（${list.length} 筆）`;pick.message='每次可修正一筆。請不要估算交易日期。';
  list.slice(0,12).forEach((t,i)=>pick.addAction(`${i+1}. ${t.merchant.slice(0,16)} / ${t.amount}`));pick.addCancelAction('取消');
  const idx=await pick.presentSheet();if(idx<0||idx>=Math.min(12,list.length))return;
  const t=list[idx],a=new Alert();a.title='核對交易';a.message=`商戶：${t.merchant}\n金額：${t.amount}`;
  a.addTextField('日期 YYYY-MM-DD',t.date||'');a.addTextField('貨幣 HKD/CNY/USD',t.currency==='UNKNOWN'?'':t.currency);a.addTextField('類別',t.category);a.addAction('儲存');a.addCancelAction('取消');
  if(await a.presentAlert()===-1)return;
  const date=dateText(a.textFieldValue(0)),cur=currencyFrom(a.textFieldValue(1)),cat=a.textFieldValue(2).trim();
  if(!date||!cur){await note('輸入無效','請輸入有效日期及 ISO 貨幣代碼，例如 HKD、CNY、USD。');return;}
  t.date=date;t.currency=cur;t.category=cat||'未分類';t.fxStatus='pending';ensureFxFields(t);save();
  const fx=await updateFX();await note('修正完成',`${t.merchant}\n${t.date} ${t.currency}\n已換算 ${fx.converted} 筆`);
}
function csvValue(v){let s=String(v??'');if(typeof v==='string' && /^[=+@\-\t\r]/.test(s))s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
async function exportData(){
  const header=['ID','日期','交易時間','原幣金額','原幣','HKD估算','匯率','匯率日期','匯率來源','匯率狀態','消費類別','商戶','信用卡','原始類別','匯入時間'];
  const csv='\ufeff'+[header,...db.transactions.map(t=>[t.id,t.date||'',t.transactionTime||'',t.amount,t.currency,t.amountHKD??'',t.fxRate??'',t.fxDate||'',t.fxSource||'',t.fxStatus||'',t.category,t.merchant,t.card,t.originalCategory||'',t.createdAt||''])].map(r=>r.map(csvValue).join(',')).join('\r\n');
  fm.writeString(exportPath,csv);fm.writeString(backupPath,JSON.stringify(db,null,2));
  await ShareSheet.present([exportPath,backupPath]);
}
async function showShortcutAudit(){
  let audit='未有 Shortcuts 執行紀錄。';
  try {
    if(fm.fileExists(shortcutAuditPath)) {
      const x=JSON.parse(fm.readString(shortcutAuditPath));
      audit='版本：'+(x.version||'?')+
       '\n上次嘗試：'+(x.lastAttemptAt||'?')+
       '\nScript：'+(x.script||'?')+
       '\n狀態：'+(x.stage||'?')+
       '\n接收類型：'+(x.inputType||'參數已處理')+
       '\n有效交易：'+(x.validCount??x.verified??0)+
       '\n新增：'+(x.added??0)+'；重複：'+(x.duplicates??0)+
       '\n解析方式：'+(x.parser||'?')+
       '\n'+(x.reason||x.error||'');
    }
  } catch(e){audit='診斷檔讀取失敗：'+String(e.message||e);}
  const latest=db.transactions.slice(-3).reverse().map(t=>
    [t.date||'無日期',t.currency,t.amount].join(' ')
  ).join('\n')||'沒有交易';
  const a=new Alert();a.title='Shortcuts 記帳診斷';
  a.message='本機交易總數：'+db.transactions.length+'\n最近交易：\n'+latest+
    '\n\n'+audit+'\n\n診斷位置：ExpenseTrackerHK/last-shortcut-run.json';
  a.addAction('確定');await a.presentAlert();
}
async function app(){
  if(args.queryParameters && args.queryParameters.view==='dashboard'){await dashboard();return;}
  const menu=new Alert();menu.title='Expense Tracker HK';menu.message=`共 ${db.transactions.length} 筆交易。所有資料只儲存在本機。`;
  menu.addAction('📊 睇 Dashboard');menu.addAction('📋 匯入剪貼簿記錄');menu.addAction('➕ 手動記帳');menu.addAction('🛠 修正待核對交易');menu.addAction('🔄 重試外幣換算');menu.addAction('📤 匯出 CSV + JSON 備份');menu.addAction('👀 預覽 Widget 尺寸');menu.addAction('🧪 查看 Shortcuts 記帳紀錄');menu.addAction('✏️ 編輯交易');menu.addAction('🗑️ 刪除交易');menu.addCancelAction('關閉');
  const choice=await menu.presentSheet();
  if(choice===0)await dashboard();
  if(choice===1)await importData(Pasteboard.pasteString(),true);
  if(choice===2)await addManual();
  if(choice===3)await review();
  if(choice===4){const r=await updateFX(12,true);await note('外幣換算',`已換算 ${r.converted} 筆，待換算 ${r.pending} 筆，失敗 ${r.failures} 筆。`);}
  if(choice===5)await exportData();
  if(choice===6)await previewWidget();
  if(choice===7)await showShortcutAudit();
  if(choice===8)await selectDashboardTransaction();
  if(choice===9)await selectDashboardTransactionToDelete();
}

// Backfill missing FX fields from previously saved v2 records.
let migrated=false;
for(const t of db.transactions){if(!t.fxStatus){ensureFxFields(t);migrated=true;}}
if(migrated)save();

// Scriptable entry point — never show Alerts when running in Siri/Shortcuts.
__expensePhase = '處理入口 / Widget';
if (config.runsInWidget) {
  Script.setWidget(buildWidget());
} else {
  const input = args.shortcutParameter;
  const hasInput = input !== null && input !== undefined &&
    (typeof input === 'object' || String(input).trim() !== '');
  const hasTextFallback=Array.isArray(args.plainTexts) && args.plainTexts.some(t=>String(t||'').trim()!=='');
  if (hasInput || hasTextFallback) {
    __expensePhase = '處理 Shortcuts 記帳';
    await importData(input, false);
  } else if (config.runsWithSiri || config.runsInActionExtension || !config.runsInApp) {
    __expensePhase = 'Shortcuts 無輸入';
    recordShortcutAttempt('no_input',{inputType:'none',hasShortcutParameter:false});
    emitShortcutReceipt('[EXPENSE-HK-v3.11.2] 未入帳\nShortcut Parameter 同 Texts 都冇資料。','no_input');
  } else {
    __expensePhase = '顯示主選單';
    await app();
  }
}
Script.complete();

}

try {
  await runExpenseTrackerHK();
} catch (err) {
  const message = (err && err.message) ? String(err.message) : String(err);
  const trace = (err && err.stack) ? String(err.stack) : '';
  const report = '階段：' + __expensePhase + '\n錯誤：' + message + (trace ? '\n' + trace.slice(0, 1500) : '');
  console.error('[ExpenseTrackerHK] ' + report);
  try {
    const am=FileManager.local(),dir=am.joinPath(am.documentsDirectory(),'ExpenseTrackerHK');
    if(!am.fileExists(dir))am.createDirectory(dir,true);
    am.writeString(am.joinPath(dir,'last-shortcut-run.json'),
      JSON.stringify({version:'3.11.2',lastAttemptAt:new Date().toISOString(),
        stage:'error',phase:__expensePhase,error:message.slice(0,250)},null,2));
  } catch(_) {}
  try { Script.setShortcutOutput({version:'3.11.2',status:'error',receipt:'[EXPENSE-HK-v3.11.2] 記帳失敗（未確認儲存）\n階段：' + __expensePhase + '\n錯誤：' + message,shouldAppendNumbers:false,requiresBatchSync:false,numbersRow:[],numbersRows:[],transactionId:'',localStored:false}); } catch (_) {}
  try {
    if (config.runsInApp && !config.runsInWidget && !config.runsWithSiri && !config.runsInActionExtension) {
      const alert = new Alert();
      alert.title = 'Expense Tracker 執行錯誤';
      alert.message = report;
      alert.addAction('關閉');
      await alert.presentAlert();
    }
  } catch (_) {}
  try { Script.complete(); } catch (_) {}
}