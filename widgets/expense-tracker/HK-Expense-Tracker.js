// Expense Tracker HK v3.20.0 — Adaptive widgets, resilient Dictionary / JSON / fallback text, non-zero amount, Siri-safe
// Replace ALL code in the existing Scriptable script; do NOT append to the old script.
let __expensePhase = "初始化";
async function runExpenseTrackerHK() {
// Expense Tracker HK v3.20.0 — iPhone Scriptable + Apple Intelligence + FX
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
    const report={version:'3.20.0',lastAttemptAt:new Date().toISOString(),
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
// Canonical Merchant Types. Legacy labels are displayed through a non-destructive
// adapter: never rewrite existing transaction IDs, categories or historical data.
const MERCHANT_TYPES=['食飯','飲品','娛樂','日用品','交通','旅行','衣服','水電','醫療','訂閱','進修','運動'];
const PAYMENT_TYPES=['信用卡','扣賬卡','現金','八達通','轉數快','銀行轉帳','電子錢包','其他'];
const merchantRules=[
 ['交通',/(KOWLOON MOTO|METRO OPERATION|MTR|KMB|CITYBUS|港鐵|鐵路|八達通|巴士|的士|UBER TRIP)/i],
 ['飲品',/(TEN REN TEA|STARBUCKS|TEA SHOP|COFFEE SHOP|手搖|飲品店)/i],
 ['食飯',/(HAMA.SUSHI|FROSTY JOY|CAFE DE CORAL|SANG ROASTERY|WING WAH CAKE|YUET EAT|AROME BAKERY|CHEF DE SINGAPORE|HIKINIKU|ZOoba|CAF CAFE|GELATO|MAN FUNG DUMPLING)/i],
 ['日用品',/(CIRCLE K|7-ELEVEN|7 ELEVEN|OK便利店|AEON|MARKET PLACE|WELLCOME|GREENPRICE|DS GROCERIES|MING FRUIT|FRESH MIST)/i],
 ['醫療',/(HUMAN HEALTH|MANNINGS|MATSUMOTO|松本|SA SA COSMETIC)/i],
 ['娛樂',/(DISNEYLAND|迪士尼)/i]
];
function canonicalCategory(raw){
 const c=String(raw==null?'':raw).trim();
 if(MERCHANT_TYPES.includes(c))return c;
 if(!c||/^(未指定|未提供|未知|未分類|NULL|NONE|OTHER|HK\$|HKD|CNY|RMB|港元|人民幣)$/i.test(c))return '未分類';
 if(/^(食物|餐飲|飲食|食肆|餐廳|外賣|吃飯|食飯|用餐|膳食|餐費)$/i.test(c)||/^(restaurants?|dining|food|food & beverage|cafe|coffee shop)$/i.test(c))return '食飯';
 if(/^(飲料|茶飲|咖啡|beverages?|drinks?)$/i.test(c))return '飲品';
 if(/^(旅遊|travel|tourism|flight|flights)$/i.test(c))return '旅行';
 if(/^(旅遊娛樂|休閒娛樂|entertainment|leisure)$/i.test(c))return '娛樂';
 if(/^(零售|購物|便利店|超市雜貨|超市|雜貨|groceries|shopping|retail)$/i.test(c))return '日用品';
 if(/^(健康醫療|健康|醫藥|healthcare|health)$/i.test(c))return '醫療';
 if(/^(服飾|服裝|clothing|apparel)$/i.test(c))return '衣服';
 if(/^(交通費|transport|transportation|transit)$/i.test(c))return '交通';
 if(/^(水電煤|utilities|bills)$/i.test(c))return '水電';
 if(/^(subscriptions?|membership)$/i.test(c))return '訂閱';
 if(/^(education|learning|courses?)$/i.test(c))return '進修';
 if(/^(fitness|sports?)$/i.test(c))return '運動';
 // Retain historical unsupported categories (e.g. 投資) in an explicit bucket.
 return '其他';
}
function categoryForDisplay(t){
 return canonicalCategory(t.category||t.originalCategory||'');
}
function categoryOf(raw,merchant){
 const supplied=canonicalCategory(raw);
 // Explicit user/AI categories ALWAYS win over ambiguous merchant keywords.
 if(MERCHANT_TYPES.includes(supplied))return supplied;
 const name=String(merchant||'');
 const match=merchantRules.find(([_,re])=>re.test(name));
 return match?match[0]:(supplied==='其他'?'其他':'未分類');
}
// Payment methods are OPEN TEXT. The suggestions are not a whitelist.
// Preserve named wallets and brands rather than collapsing Payme into "電子錢包".
function normalizePaymentType(raw){
 const s=String(raw==null?'':raw).trim().slice(0,80);
 if(!s||/^(null|undefined|none|n\/a|未知|未提供)$/i.test(s))return '';
 if(/^(octopus|八達通)$/i.test(s))return '八達通';
 if(/^(cash|現金)$/i.test(s))return '現金';
 if(/^(fps|轉數快|轉數快 FPS)$/i.test(s))return '轉數快';
 if(/^(bank transfer|wire transfer|銀行轉帳|銀行轉賬)$/i.test(s))return '銀行轉帳';
 if(/^(debit card|扣賬卡)$/i.test(s))return '扣賬卡';
 if(/^(credit card|信用卡)$/i.test(s))return '信用卡';
 if(/^(e-wallet|ewallet|電子錢包)$/i.test(s))return '電子錢包';
 if(/^(payme)$/i.test(s))return 'Payme';
 if(/^(alipayhk|alipay hk)$/i.test(s))return 'AlipayHK';
 if(/^(apple pay)$/i.test(s))return 'Apple Pay';
 // Explicit user-defined paymentType is NEVER collapsed to a whitelist.
 return s;
}
function paymentTypeFromCard(card){
 const s=normalizePaymentType(card);
 if(!s)return '';
 // Only fallback from Card may infer a broad card class.
 if(/\b(visa|mastercard|amex|american express)\b/i.test(s))return '信用卡';
 return s;
}
function paymentTypeOf(t){
 if(!t)return '';
 const explicit=normalizePaymentType(t.paymentType);
 return explicit||paymentTypeFromCard(t.card);
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
  const paymentType=normalizePaymentType(field(t,'paymentType','PaymentType','paymentMethod','PaymentMethod','支付類型','付款類型'))||
    paymentTypeFromCard(card);
  const remark=String(field(t,'remark','Remark','remarks','Remarks','note','notes','memo','備註','補充')||'').trim().slice(0,800);
  const suppliedId=String(field(t,'id','ID','transactionId','TransactionID','交易ID')||'').trim();
  const source=String(field(t,'Source','source')||'Shortcut').trim();
  const eventId=suppliedId || (transactionTime?
    'time:'+hash([transactionTime,merchant.toLowerCase(),card.toLowerCase(),amount,currency].join('|')):'');
  return {
    id:eventId,date,transactionTime,amount,currency,
    category:categoryOf(rawCategory,merchant),merchant,card,paymentType,remark,source,
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
function groupSum(rows,keyFn){const r=Object.create(null);for(const t of rows){const key=String(keyFn(t));r[key]=(r[key]||0)+(t.amountHKD||0);}return r;}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function pieSVG(entries) {
  const colors=['#47b6ff','#9b8cff','#34d399','#fbba55','#fa7894','#5fdddc','#9ca3af'];
  const safe=entries.filter(v=>v[1]>0);
  const total=safe.reduce((a,x)=>a+x[1],0);
  if(!total)return '<p class="muted">暫無分類支出</p>';
  let x=0;
  const gradient=safe.map((r,i)=>{const start=x;x+=r[1]/total*100;return `${colors[i%colors.length]} ${start}% ${x}%`;}).join(',');
  return `<div class="donutrow"><div class="donut" style="background:conic-gradient(${gradient})"><div class="hole">分類<br><b>${safe.length}</b></div></div><div class="legend">${safe.map((r,i)=>`<div><span class="dot" style="background:${colors[i%colors.length]}"></span><span>${esc(r[0])}</span><b>${Math.round(r[1]/total*100)}%</b></div>`).join('')}</div></div>`;
}
function dashboardTrendSVG(items,color='#55b6ff'){
  const valid=items.some(r=>Number.isFinite(r.value)&&Math.abs(r.value)>0.000001);
  if(!valid)return '<div class="empty-trend">呢段期間暫時冇可繪製嘅支出數值</div>';
  const w=560,h=120,l=14,r=14,top=9,bottom=27;
  const positive=Math.max(0,...items.map(x=>Number(x.value)||0));
  const negative=Math.min(0,...items.map(x=>Number(x.value)||0));
  const range=Math.max(1,positive-negative);
  const span=h-top-bottom,base=top+span*(positive/range);
  const cell=(w-l-r)/items.length,barWidth=Math.min(23,cell*.63);
  let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="支出趨勢圖" xmlns="http://www.w3.org/2000/svg">`;
  svg+=`<line x1="${l}" y1="${base.toFixed(2)}" x2="${w-r}" y2="${base.toFixed(2)}" stroke="#47576d" stroke-width="1"/>`;
  items.forEach((d,i)=>{
    const val=Number(d.value)||0,x=l+i*cell+(cell-barWidth)/2;
    const y=val>=0?base-span*(val/range):base;
    const bh=Math.max(Math.abs(val)*span/range, val===0?0:2);
    if(val!==0)svg+=`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${barWidth.toFixed(2)}" height="${bh.toFixed(2)}" rx="3" fill="${val>=0?color:'#45d2a0'}"><title>${esc(d.label)}: HK$${Number(val).toFixed(2)}</title></rect>`;
    if(items.length<=8||i%2===0)svg+=`<text x="${(x+barWidth/2).toFixed(2)}" y="${h-8}" fill="#91a7c4" font-size="${items.length>10?11:12}" text-anchor="middle">${esc(d.label)}</text>`;
  });
  return svg+'</svg>';
}
function dashboardHTML(flash=''){
  const now=today(),month=monthStart(now),all=db.transactions,valid=hk(all);
  const monthRows=valid.filter(t=>monthStart(t.date)===month);
  const lastMonth=valid.filter(t=>monthStart(t.date)===monthsBack(1));
  const todayRows=valid.filter(t=>t.date===now);
  const sevenDays=new Set(Array.from({length:7},(_,i)=>dayBack(i)));
  const weekRows=valid.filter(t=>sevenDays.has(t.date));
  const monthTotal=sum(monthRows),todayTotal=sum(todayRows);
  const prevTotal=sum(lastMonth);
  const diff=prevTotal?((monthTotal-prevTotal)/Math.abs(prevTotal)*100).toFixed(1)+'%':'—';
  const missingDate=all.filter(t=>!t.date).length,unknownCurrency=all.filter(t=>t.currency==='UNKNOWN').length;
  const pending=all.filter(t=>t.fxStatus==='pending').length;
  const monthlyCategoryRows=MERCHANT_TYPES.map(name=>{
    const rows=monthRows.filter(t=>categoryForDisplay(t)===name);
    return {name,count:rows.length,net:sum(rows)};
  });
  const extra=monthRows.filter(t=>!MERCHANT_TYPES.includes(categoryForDisplay(t)));
  if(extra.length)monthlyCategoryRows.push({name:'其他／未分類',count:extra.length,net:sum(extra)});
  const categoryEntries=Object.entries(groupSum(monthRows,t=>categoryForDisplay(t)))
    .filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  const paymentLabels=[...new Set(all.map(t=>paymentTypeOf(t)).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  const cardLabels=[...new Set(all.map(t=>String(t.card||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'zh-Hant'));
  const paymentRows=Object.entries(groupSum(monthRows.filter(t=>paymentTypeOf(t)),t=>paymentTypeOf(t)))
    .sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  const merchantRows=Object.entries(groupSum(monthRows,t=>t.merchant)).filter(([,v])=>v>0)
    .sort((a,b)=>b[1]-a[1]).slice(0,5);
  const days=Array.from({length:14},(_,i)=>{const d=dayBack(13-i);return {label:d.slice(8),value:sum(valid.filter(t=>t.date===d))};});
  const sixMonths=Array.from({length:6},(_,i)=>{const m=monthsBack(5-i);return {label:m.slice(5)+'月',value:sum(valid.filter(t=>monthStart(t.date)===m))};});
  const recent=all.map((t,index)=>({t,index})).sort((a,b)=>
    String(b.t.transactionTime||b.t.date||b.t.createdAt||'').localeCompare(String(a.t.transactionTime||a.t.date||a.t.createdAt||'')));
  const unnamed=all.filter(t=>!paymentTypeOf(t)).length;
  const categoryPeak=Math.max(1,...monthlyCategoryRows.map(x=>Math.max(0,x.net)));
  const topCategories=monthlyCategoryRows.filter(x=>x.net>0).sort((a,b)=>b.net-a.net).slice(0,3);
  const positiveCategoryTotal=topCategories.length?categoryEntries.reduce((a,x)=>a+Math.max(0,x[1]),0):0;
  const displayMonth=Number(now.slice(5,7))+'月';
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Expense Tracker HK</title>
  <style>
:root{color-scheme:dark;--bg:#0e1624;--panel:#19273b;--panel2:#20324b;--line:#344962;--text:#eef5ff;--muted:#9db0c9;--blue:#64bcff;--green:#4ed5a5}
*{box-sizing:border-box}html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"PingFang HK",sans-serif;color:var(--text);font-size:14px}
button,input,select{font:inherit}button{cursor:pointer;-webkit-tap-highlight-color:transparent}
.wrap{max-width:760px;margin:0 auto;padding:max(110px,calc(env(safe-area-inset-top,0px) + 68px)) 14px 46px}
.head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}
.head-title{min-width:0}.eyebrow{font-weight:750;letter-spacing:.11em;font-size:10px;color:var(--blue)}
h1{font-size:25px;line-height:1.25;margin:3px 0 1px;letter-spacing:-.4px}
.muted{color:var(--muted)}.subtitle{font-size:11px;color:var(--muted)}
.quick-add{flex-shrink:0;white-space:nowrap;text-decoration:none;background:#3276ab;color:#fff;padding:12px;border-radius:13px;font-weight:750;font-size:13px}
.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-bottom:10px}
.metric{min-width:0;background:linear-gradient(145deg,#1d344f,#17273d);border:1px solid #35506b;border-radius:16px;padding:14px 13px}
.metric-label{font-size:12px;color:#b1c5dd}.metric-num{font-size:clamp(20px,5vw,29px);letter-spacing:-.5px;font-weight:800;margin:8px 0 4px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.metric-sub{font-size:11px;color:#9eafc5}
.overview{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 11px}.mini-pill{border-radius:99px;background:#20334b;color:#bfd0e5;padding:6px 9px;font-size:11px}
details.status{margin:0 0 12px;color:var(--muted);font-size:12px}details.status summary{cursor:pointer;list-style:none}
details.status summary::before{content:"› ";color:var(--blue)}details.status[open] summary::before{content:"⌄ "}
.status-body{margin-top:9px;display:flex;gap:7px;flex-wrap:wrap}
.panel{background:var(--panel);border:1px solid #2c4160;border-radius:17px;padding:14px;margin:0 0 11px;min-width:0;overflow:hidden}
.section-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:11px}
h2{font-size:16px;line-height:1.2;margin:0;font-weight:740}.small{font-size:11px;color:var(--muted)}
.category-overview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.category-tile{min-width:0;border:1px solid #354b66;border-radius:11px;padding:10px 5px;background:#202f45;color:#e9f4ff;min-height:65px;text-align:center}
.category-tile strong{font-size:13px;display:block}.category-tile span{font-size:11px;color:#8ed2ff;display:block;margin-top:5px;min-height:13px}
.category-tile.active{border-color:#7eceff;background:#335779;box-shadow:inset 0 0 0 1px #7eceff}
.footnote{font-size:11px;color:var(--muted);line-height:1.5;margin:10px 0 0}
.pay-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pay-tile{min-width:0;background:#23344c;border:1px solid #3a4e67;border-radius:12px;padding:10px;text-align:left;color:var(--text)}
.pay-tile span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.pay-tile strong{font-size:15px;display:block;margin-top:6px;font-variant-numeric:tabular-nums}
.pay-tile.active{background:#2b5979;border-color:#73bdf0}
.empty-state{padding:12px;background:#213046;color:var(--muted);border-radius:10px;text-align:center;font-size:12px}
.tx-search{display:block;width:100%;background:#111d2e;border:1px solid #3b5472;color:#f4faff;padding:13px;border-radius:11px;font-size:14px;outline:0}
.tx-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:9px 0 12px}
.tx-filters select,.clear-button{min-width:0;width:100%;background:#22354c;border:1px solid #3d5875;color:#e6f1ff;border-radius:10px;padding:10px 8px;font-size:12px}
.clear-button{background:#294e70;font-weight:700}
.list-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 9px}
.tx-list{display:grid;gap:8px}.tx-swipe-shell{position:relative;overflow:hidden;border-radius:13px;background:#27384f;isolation:isolate}
.tx-swipe-shell[hidden]{display:none}.tx-swipe-action{position:absolute;inset:0 0 0 auto;width:88px;background:#d33e4b;display:flex}
.tx-delete{width:88px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;color:#fff;text-decoration:none;font-weight:750;font-size:12px}
.tx-swipe-front{display:flex;align-items:center;gap:8px;min-height:75px;padding:10px;position:relative;z-index:1;background:#21344c;transform:translateX(0);transition:transform .18s ease;touch-action:pan-y}
.tx-swipe-shell.is-open .tx-swipe-front{transform:translateX(-88px)}
.tx-main{flex:1;min-width:0}.tx-line{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.tx-merchant{font-size:13px;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tx-value{font-size:14px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
.negative{color:var(--green)}.tx-meta{display:flex;flex-wrap:wrap;gap:4px 9px;margin-top:5px;color:#a7bdd6;font-size:11px}
.tx-pay,.tx-remark{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.tx-remark{font-size:11px;color:#99d6ff;margin-top:6px}
.edit-link{padding:9px 8px;color:#e8f6ff;background:#2d5c83;border-radius:9px;text-decoration:none;white-space:nowrap;font-size:11px;font-weight:700}
.tx-more{background:#294c6b;color:#d0e6ff;border:0;border-radius:9px;min-height:34px;min-width:26px;font-size:20px}
.tx-delete:focus-visible,.edit-link:focus-visible,.tx-more:focus-visible{outline:2px solid white;outline-offset:-3px}
.tx-hint{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.45}
.trend-controls{display:flex;gap:5px;align-items:center}
.trend-switch{border-radius:8px;padding:6px 9px;background:#22374e;color:#c4dcf7;border:1px solid #365676;font-size:11px}
.trend-switch.active{background:#357db2;border-color:#62bfff;color:#fff}
.trend-panel svg{width:100%;height:auto;display:block;max-height:145px}.trend-panel[hidden]{display:none}
.empty-trend{color:var(--muted);text-align:center;font-size:12px;padding:26px 5px}
.merchantrow{display:flex;justify-content:space-between;gap:10px;margin:9px 0;color:#d2e4f8;font-size:12px}
.merchantrow span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.merchantrow strong{white-space:nowrap}.barline{background:#2b4159;border-radius:99px;height:5px;overflow:hidden;margin-top:5px}
.barfill{height:100%;background:#5bbdff;border-radius:99px}
.detail-section summary{font-size:12px;font-weight:600;color:var(--blue);cursor:pointer;list-style:none}
.detail-section summary::after{content:"  ›"}.detail-section[open] summary::after{content:"  ⌄"}
.donutrow{display:flex;align-items:center;gap:16px;margin-top:12px}.donut{width:106px;height:106px;flex:0 0 106px;border-radius:50%;display:grid;place-items:center}
.hole{width:67px;height:67px;background:var(--panel);border-radius:50%;display:grid;place-content:center;text-align:center;font-size:10px;color:var(--muted)}
.hole b{font-size:16px;color:var(--text)}.legend{flex:1;min-width:0}
.legend>div{display:flex;align-items:center;gap:6px;margin:5px 0;font-size:11px}
.legend span:nth-child(2){flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.dot{width:8px;height:8px;border-radius:3px;flex-shrink:0}
.save-flash{background:#174b3a;border:1px solid #429b79;color:#c2ffe6;padding:11px 12px;border-radius:11px;margin:0 0 12px;font-size:12px}
.footer{color:#8398b5;font-size:11px;text-align:center;line-height:1.5;padding:12px 0}
@media(max-width:365px){.wrap{padding-left:10px;padding-right:10px}.metric{padding:11px}.metric-num{font-size:19px}.category-tile{min-height:60px}.tx-swipe-front{gap:5px;padding:8px}.edit-link{padding:8px 6px}.pay-grid{gap:6px}}
@media(min-width:650px){.category-overview{grid-template-columns:repeat(4,minmax(0,1fr))}.wrap{padding-top:max(104px,calc(env(safe-area-inset-top,0px) + 60px))}}
@media(prefers-reduced-motion:reduce){.tx-swipe-front{transition:none}}
  
/* v3.20.0 — Research-informed, iPhone-first premium money dashboard.
   Explicitly authored after Apple HIG / NNGroup / Tableau / Carbon / WCAG review.
   No external fonts, libraries, logos, tracking or network resources. */
:root{--bg:#0b101a;--panel:#131c2b;--panel2:#1c293b;--line:#29374b;--text:#f7f8ff;--muted:#9aa9bb;--blue:#a99bff;--green:#7ce5c0;--violet:#a897ff;--amber:#ffc688}
body{background:radial-gradient(ellipse 130% 350px at 8% 0%,rgba(119,104,255,.11),transparent 65%),var(--bg);color:var(--text)}
.wrap{max-width:700px;padding:max(112px,calc(env(safe-area-inset-top,0px) + 68px)) 16px calc(35px + env(safe-area-inset-bottom,0px))}
.head{align-items:center;margin:0 0 14px;gap:12px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.brand-mark{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:14px;background:linear-gradient(145deg,#a49bff,#7066d2);box-shadow:0 5px 26px rgba(118,111,255,.21);font-size:23px;color:white}
.head-title{min-width:0}.head-title h1{font-size:23px;line-height:1.17;letter-spacing:-.5px;margin-top:3px}
.eyebrow{color:#a89fff;font-size:10px;letter-spacing:.09em;font-weight:800}
.subtitle{color:#899cb2;font-size:11px;margin-top:4px}
.quick-add{border-radius:14px;background:#e1deff;color:#262047;padding:13px 14px;font-size:13px;box-shadow:0 6px 20px rgba(151,139,255,.10)}
.quick-add:active{transform:scale(.98)}
.quick-nav{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 0 15px}
.quick-nav::-webkit-scrollbar{display:none}
.quick-nav a{border:1px solid #28364a;border-radius:9px;background:#161e2c;color:#b7c4d8;text-decoration:none;font-size:12px;padding:8px 12px;white-space:nowrap;font-weight:600}
.quick-nav a:first-child{border-color:#6960ac;color:#dedbff}
.hero{overflow:hidden;position:relative;border-radius:24px;background:linear-gradient(125deg,#514a92 0%,#3d477e 52%,#2b5274 110%);padding:23px 22px 20px;margin-bottom:10px;isolation:isolate;border:1px solid rgba(186,177,255,.26);box-shadow:0 14px 35px rgba(0,0,0,.19)}
.hero:before{content:"";position:absolute;z-index:-1;top:-125px;right:-115px;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(183,190,255,.35),rgba(124,171,233,.11) 44%,transparent 70%)}
.hero:after{content:"";position:absolute;z-index:-1;bottom:-115px;left:-85px;width:240px;height:240px;border:1px solid rgba(225,228,255,.17);border-radius:50%;box-shadow:0 0 0 36px rgba(244,245,255,.018),0 0 0 72px rgba(244,245,255,.014)}
.hero-kicker{display:flex;align-items:center;gap:8px;color:#e6e9ff;font-weight:700;font-size:12px;letter-spacing:.02em}
.hero-dot{display:inline-block;height:7px;width:7px;border-radius:50%;background:#9cf5d0;box-shadow:0 0 10px rgba(143,255,210,.8)}
.hero-amount{font-size:clamp(35px,9.8vw,48px);font-weight:780;line-height:1.14;letter-spacing:-1.6px;margin:19px 0 14px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;color:#fff}
.hero-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.hero-badge{display:inline-flex;gap:6px;border-radius:30px;padding:8px 10px;background:rgba(11,18,37,.28);border:1px solid rgba(232,232,255,.2);color:#e7edff;font-weight:600;font-size:11px}
.hero-soft{color:#d2dafa;font-size:11px}
.summary{gap:9px;margin-bottom:13px}
.metric{border-radius:17px;background:linear-gradient(153deg,#172434,#131c2b);border:1px solid #2b3a50;box-shadow:none;min-height:112px;padding:15px}
.metric-label{color:#adbbd0;font-size:12px}.metric-num{font-size:clamp(20px,5vw,26px);margin:11px 0 5px;color:#f5f8ff}
.metric-sub{color:#8399b1;font-size:11px}
.overview{gap:6px;margin-bottom:12px}.mini-pill{background:#172538;border:1px solid #293a50;color:#a9bad0;font-size:10px;padding:6px 9px}
details.status{font-size:11px}.panel{padding:17px 15px;border:1px solid #293749;border-radius:19px;background:linear-gradient(140deg,#172133,#111b29);margin-bottom:11px}
.section-top{align-items:center;margin-bottom:14px}h2{font-size:17px;font-weight:750;letter-spacing:-.3px}.small{color:#879db4;font-size:11px}
.category-overview{grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.category-tile{min-height:105px;display:flex;align-items:flex-start;flex-direction:column;justify-content:flex-start;gap:6px;border-radius:15px;border:1px solid #2d3a4f;padding:11px 10px;background:#182438;text-align:left;position:relative}
.category-tile .cat-top{display:flex;align-items:center;gap:7px;width:100%;min-width:0}
.category-tile .cat-icon{display:inline-grid;place-items:center;width:29px;height:29px;flex:0 0 29px;border-radius:9px;background:color-mix(in srgb,var(--cat-accent) 13%,transparent)}
.category-tile .cat-icon svg{width:20px!important;height:20px!important}
.category-tile strong{font-size:12px;font-weight:750;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.category-tile .cat-val{font-size:12px;font-weight:800;color:#ecf3ff;margin:1px 0 0;min-height:17px;font-variant-numeric:tabular-nums;letter-spacing:-.15px}
.category-tile .cat-track{display:block;width:100%;height:3px;margin-top:auto;background:#2b394a;border-radius:4px;overflow:hidden}
.category-tile .cat-fill{display:block;height:100%;background:var(--cat-accent);border-radius:4px}
.category-tile.active{background:#293b55;border-color:#a799ff;box-shadow:0 0 0 1px rgba(171,158,255,.27)}
.rankings{display:grid;gap:13px;margin-bottom:17px}
.rank-item{display:grid;gap:6px}
.rank-head{display:flex;justify-content:space-between;gap:8px;font-size:12px;font-weight:650}
.rank-head .rank-right{color:#b5c2d8;font-variant-numeric:tabular-nums;white-space:nowrap}
.rank-bar{height:6px;border-radius:9px;background:#26354a;overflow:hidden}
.rank-bar span{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#a89cff,#7ad9d4)}
.pay-grid{gap:8px}.pay-tile{min-height:72px;display:flex;align-items:center;gap:10px;background:#17263b;border-radius:13px;border:1px solid #293d55;padding:10px;color:#fff}
.pay-tile .pay-mark{height:34px;width:34px;flex:0 0 34px;border-radius:11px;display:grid;place-items:center;font-weight:800;background:#34355e;color:#c9bfff;font-size:16px}
.pay-tile .pay-info{min-width:0;display:flex;flex-direction:column;gap:4px}
.pay-tile .pay-info span{font-size:11px;font-weight:700;color:#eef3ff;max-width:100%}
.pay-tile .pay-info strong{font-size:13px;color:#b4c2dd}
.pay-tile.active{border-color:#a89cff;background:#2a3457}
.footnote{color:#899db8;font-size:11px;line-height:1.55}
.tx-search{border-radius:13px;background:#0f1826;border:1px solid #34465f;padding:13px;font-size:14px}
.tx-filters select,.clear-button{min-height:44px;border-radius:11px;background:#1d2d41;font-size:12px}
.tx-swipe-shell{border-radius:13px;background:#1d293a}
.tx-swipe-front{min-height:83px;background:#1b2a3d;padding:12px 9px;gap:10px}
.tx-avatar{height:36px;width:36px;flex:0 0 36px;border-radius:12px;background:#2a314a;display:grid;place-items:center}
.tx-avatar svg{width:22px!important;height:22px!important}
.tx-merchant{font-size:13px}.tx-value{font-size:14px}
.tx-meta{font-size:10px;gap:4px 8px}.tx-remark{font-size:11px;color:#abc5f3}
.edit-link{min-height:40px;display:inline-flex;align-items:center;padding:7px 9px;border-radius:11px;background:#293f5d}
.tx-more{min-width:35px;min-height:40px}
.trend-panel svg{max-height:160px}
.trend-switch{min-height:39px;padding:8px 10px;border-radius:10px}
.trend-switch.active{background:#625a9b;border-color:#aba0ff}
.detail-section{padding-top:10px}.detail-section summary{font-size:12px}
.empty-state,.empty-trend{background:#182538;border:1px dashed #314258;border-radius:12px;padding:18px;color:#9dacc1}
.tx-hint{color:#869db5}
.footer{color:#7d91aa}
a:focus-visible,button:focus-visible,summary:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #b6a9ff!important;outline-offset:3px}
#categories,#payments,#transactions,#trends{scroll-margin-top:16px}
@media(max-width:365px){.wrap{padding-left:11px;padding-right:11px}.brand-mark{flex-basis:37px;width:37px;height:37px}.head-title h1{font-size:20px}.quick-add{font-size:12px;padding:11px 10px}.hero{padding:20px 17px}.category-overview{gap:6px}.category-tile{padding:9px 6px;min-height:95px}.category-tile .cat-icon{width:24px;height:24px;flex-basis:24px}.category-tile .cat-icon svg{width:18px!important;height:18px!important}}
@media(min-width:650px){.category-overview{grid-template-columns:repeat(4,minmax(0,1fr))}.hero{padding:29px 30px}}

  </style></head><body><main class="wrap">
  <header class="head"><div class="brand"><span class="brand-mark" aria-hidden="true">◈</span><div class="head-title"><div class="eyebrow">MY EXPENSES · HKD</div><h1>記帳儀表板</h1><div class="subtitle">${esc(now)} · 私人本機記錄</div></div></div><a class="quick-add" href="https://expense-editor.invalid/manual-open">＋ 記帳</a></header>
  <nav class="quick-nav" aria-label="Dashboard 快速導覽"><a href="#overview">總覽</a><a href="#categories">分類</a><a href="#payments">付款方式</a><a href="#transactions">交易</a><a href="#trends">趨勢</a></nav>
  ${flash?`<div class="save-flash">${esc(flash)}</div>`:''}
  <section class="hero" id="overview" aria-label="本月 HKD 淨支出">
    <div class="hero-kicker"><span class="hero-dot" aria-hidden="true"></span> ${displayMonth}淨支出 · HKD</div>
    <div class="hero-amount">${toMoney(monthTotal)}</div>
    <div class="hero-footer"><span class="hero-badge">↗ 較上月 ${esc(diff)}</span><span class="hero-soft">本月 ${monthRows.length} 筆已換算記錄</span></div>
  </section>
  <div class="summary"><div class="metric"><div class="metric-label">今日支出</div><div class="metric-num">${toMoney(todayTotal)}</div><div class="metric-sub">本日已換算 HKD</div></div>
  <div class="metric"><div class="metric-label">近 7 日支出</div><div class="metric-num">${toMoney(sum(weekRows))}</div><div class="metric-sub">包含負數退款</div></div></div>
  <div class="overview"><span class="mini-pill">共 ${all.length} 筆</span><span class="mini-pill">本月 ${monthRows.length} 筆已換算</span><span class="mini-pill">退款 ${all.filter(t=>Number(t.amount)<0).length} 筆</span></div>
  <details class="status"><summary>資料狀態／未換算項目</summary><div class="status-body"><span class="mini-pill">日期待核對 ${missingDate}</span><span class="mini-pill">貨幣待核對 ${unknownCurrency}</span><span class="mini-pill">匯率待換算 ${pending}</span></div></details>
  <section class="panel" id="categories" aria-labelledby="categoryHeading"><div class="section-top"><h2 id="categoryHeading">本月分類</h2><span class="small">12 種 · 點選篩選</span></div>
  ${topCategories.length?`<div class="rankings">${topCategories.map((c,i)=>`<div class="rank-item"><div class="rank-head"><span>${esc(c.name)}</span><span class="rank-right">${toMoney(c.net)} · ${positiveCategoryTotal?Math.round(c.net/positiveCategoryTotal*100):0}%</span></div><div class="rank-bar"><span style="width:${Math.min(100,c.net/categoryPeak*100).toFixed(1)}%"></span></div></div>`).join('')}</div>`:''}
  <div class="category-overview">${monthlyCategoryRows.map(c=>{
    const design=MANUAL_CATEGORIES.find(x=>x.id===c.name);
    const tint=design?design.color:'#8997b6';
    const icon=design?manualIconSVG(design.icon,tint):'';
    return `<button class="category-tile" type="button" style="--cat-accent:${tint}" data-pick-category="${esc(c.name==='其他／未分類'?'其他':c.name)}" aria-pressed="false"><span class="cat-top"><span class="cat-icon">${icon}</span><strong>${esc(c.name)}</strong></span><span class="cat-val">${c.count?toMoney(c.net):''}</span><span class="cat-track"><span class="cat-fill" style="width:${c.count?Math.min(100,Math.max(0,c.net)/categoryPeak*100).toFixed(1):0}%"></span></span></button>`;
  }).join('')}</div>
  <p class="footnote">只有已換算 HKD 嘅交易會計入金額；冇交易嘅類別留空。歷史「食物／餐飲」會顯示為「食飯」，不會改寫原始紀錄。</p>
  <details class="detail-section"><summary>查看分類佔比</summary>${pieSVG(categoryEntries.slice(0,5).concat(categoryEntries.length>5?[['其他',categoryEntries.slice(5).reduce((a,x)=>a+x[1],0)]]:[]))}</details></section>
  <section class="panel" id="payments" aria-labelledby="paymentHeading"><div class="section-top"><h2 id="paymentHeading">付款方式</h2><span class="small">按方式篩選交易</span></div>
  ${paymentRows.length?`<div class="pay-grid">${paymentRows.map(([name,net])=>`<button class="pay-tile" type="button" data-pick-payment="${esc(name)}"><span class="pay-mark" aria-hidden="true">${esc(name.slice(0,1).toUpperCase())}</span><span class="pay-info"><span>${esc(name)}</span><strong>${toMoney(net)}</strong></span></button>`).join('')}</div>`:'<div class="empty-state">未有付款方式金額；例如 Payme、AlipayHK、自訂名稱都會自動出現</div>'}
  <p class="footnote">Payment Type 係自訂文字；冇指定就根據原有 Card 推斷。未換算外幣唔計入 HKD 金額。</p></section>
  <section class="panel" id="transactions"><div class="section-top"><h2>交易記錄／快速搜尋</h2><span class="small">${recent.length} 筆</span></div>
  <input class="tx-search" id="txSearch" type="search" placeholder="搜尋商戶、備註、Payme、類別、日期…" aria-label="搜尋交易及備註" autocomplete="off">
  <div class="tx-filters">
  <select id="txCategoryFilter" aria-label="Merchant Type 分類篩選"><option value="">全部 Merchant Type</option>${MERCHANT_TYPES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}<option value="其他">其他／未分類</option></select>
  <select id="txPaymentFilter" aria-label="付款方式篩選"><option value="">全部付款方式</option>${paymentLabels.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}${unnamed?'<option value="未指定">未指定</option>':''}</select>
  <select id="txCardFilter" aria-label="卡名篩選"><option value="">全部 Card</option>${cardLabels.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select>
  <button type="button" id="txReset" class="clear-button">清除篩選</button></div>
  <div class="list-head"><strong>所有交易</strong><span id="txVisible" class="small">${recent.length} 筆符合</span></div>
  <div class="tx-list" id="txList">${recent.length?recent.map(({t,index})=>{
    const cat=categoryForDisplay(t),payment=paymentTypeOf(t),card=String(t.card||''),remark=String(t.remark||'');
    const terms=[t.date||'',t.transactionTime||'',t.merchant||'',t.category||'',t.originalCategory||'',cat,payment,card,t.currency||'',remark,t.source||''].join(' ').toLowerCase();
    return `<div class="tx-swipe-shell" data-row="${index}" data-filter="${esc(terms)}" data-category="${esc(cat)}" data-payment="${esc(payment||'未指定')}" data-card="${esc(card)}">
    <div class="tx-swipe-action"><a class="tx-delete" href="https://expense-editor.invalid/delete?row=${index}" aria-label="刪除第 ${index+1} 筆交易">🗑️<span>刪除</span></a></div>
    <div class="tx-swipe-front"><span class="tx-avatar" aria-hidden="true">${(()=>{const x=MANUAL_CATEGORIES.find(c=>c.id===cat);return x?manualIconSVG(x.icon,x.color):'◈';})()}</span><div class="tx-main"><div class="tx-line"><span class="tx-merchant">${esc(t.merchant||'未提供商戶')}</span><span class="tx-value ${t.amount<0?'negative':''}">${esc(t.currency)} ${Number(t.amount).toFixed(2)}</span></div>
    <div class="tx-meta"><span>${esc(t.transactionTime||t.date||'待核對')}</span><span>${esc(cat)}</span>${payment?`<span class="tx-pay">${esc(payment)}${card&&payment!==card?' · '+esc(card):''}</span>`:card?`<span>${esc(card)}</span>`:''}<span>${Number.isFinite(t.amountHKD)?toMoney(t.amountHKD):'HKD 待換算'}</span></div>
    ${remark?`<div class="tx-remark">📝 ${esc(remark)}</div>`:''}</div>
    <a class="edit-link" href="https://expense-editor.invalid/edit?row=${index}">✏️ 編輯</a><button class="tx-more" type="button" aria-label="顯示刪除操作" aria-expanded="false">⋯</button></div></div>`;
  }).join(''):'<div class="empty-state">未有交易紀錄</div>'}</div>
  <p class="tx-hint">向左滑顯示刪除鍵，再確認先會刪除；按「✏️ 編輯」可補 Remark、商戶、分類及付款方式。本機修改唔會同步 Apple Numbers。</p></section>
  <section class="panel" id="trends"><div class="section-top"><h2>支出趨勢</h2><div class="trend-controls"><button class="trend-switch active" type="button" data-trend="days">近14日</button><button class="trend-switch" type="button" data-trend="months">近6個月</button></div></div>
  <div class="trend-panel" id="trendDays">${dashboardTrendSVG(days)}</div>
  <div class="trend-panel" id="trendMonths" hidden>${dashboardTrendSVG(sixMonths,'#a48eff')}</div>
  <p class="footnote">顯示已換算 HKD 淨支出；負數綠色代表退款。冇資料時唔會留巨型空白圖。</p></section>
  ${merchantRows.length?`<section class="panel"><div class="section-top"><h2>本月常用商戶</h2><span class="small">按金額排序</span></div>${merchantRows.map(([name,n])=>`<div class="merchantrow"><span>${esc(name)}</span><strong>${toMoney(n)}</strong></div><div class="barline"><div class="barfill" style="width:${Math.min(100,Math.max(0,n/merchantRows[0][1]*100)).toFixed(2)}%"></div></div>`).join('')}</section>`:''}
  <div class="footer">本機資料 · 付款方式不限預設分類 · 已保留原始卡名及 Shortcut 欄位</div>
  </main><script>(function(){
  var search=document.getElementById("txSearch");
  var categoryFilter=document.getElementById("txCategoryFilter");
  var paymentFilter=document.getElementById("txPaymentFilter");
  var cardFilter=document.getElementById("txCardFilter");
  var cards=Array.prototype.slice.call(document.querySelectorAll(".tx-swipe-shell"));
  var opened=null;
  function reveal(card,yes){
    if(opened&&opened!==card){
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
    var front=card.querySelector(".tx-swipe-front"),toggle=card.querySelector(".tx-more");
    var x=0,y=0,tracking=false,dragging=false,wasOpen=false;
    if(toggle)toggle.addEventListener("click",function(e){e.stopPropagation();reveal(card,!card.classList.contains("is-open"));});
    card.addEventListener("touchstart",function(e){
      if(e.touches.length!==1||e.target.closest("a,button"))return;
      x=e.touches[0].clientX;y=e.touches[0].clientY;
      wasOpen=card.classList.contains("is-open");tracking=true;dragging=false;
    },{passive:true});
    card.addEventListener("touchmove",function(e){
      if(!tracking||e.touches.length!==1)return;
      var dx=e.touches[0].clientX-x,dy=e.touches[0].clientY-y;
      if(!dragging&&(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.3))return;
      dragging=true;e.preventDefault();
      front.style.transition="none";
      front.style.transform="translateX("+Math.max(-88,Math.min(0,(wasOpen?-88:0)+dx))+"px)";
    },{passive:false});
    card.addEventListener("touchend",function(e){
      if(!tracking)return;tracking=false;
      var dx=e.changedTouches.length?e.changedTouches[0].clientX-x:0;
      var show=dragging?(wasOpen?dx<32:dx< -38):wasOpen;
      front.style.transition="";front.style.transform="";
      reveal(card,show);dragging=false;
    },{passive:true});
    card.addEventListener("touchcancel",function(){
      if(!tracking)return;tracking=false;dragging=false;
      front.style.transition="";front.style.transform="";reveal(card,wasOpen);
    },{passive:true});
  });
  function applyFilters(){
    var q=search?search.value.trim().toLowerCase():"";
    var cat=categoryFilter?categoryFilter.value:"";
    var pay=paymentFilter?paymentFilter.value:"";
    var chosen=cardFilter?cardFilter.value:"";
    var visibleCount=0;
    cards.forEach(function(card){
      var ownCat=card.getAttribute("data-category");
      var matchesCat=!cat||(cat==="其他"?["其他","未分類"].includes(ownCat):ownCat===cat);
      var visible=card.getAttribute("data-filter").includes(q)&&matchesCat
        &&(!pay||card.getAttribute("data-payment")===pay)
        &&(!chosen||card.getAttribute("data-card")===chosen);
      card.hidden=!visible;
      if(visible)visibleCount++;
      if(!visible&&card.classList.contains("is-open"))reveal(card,false);
    });
    var count=document.getElementById("txVisible");
    if(count)count.textContent=visibleCount+" 筆符合";
    document.querySelectorAll(".category-tile").forEach(function(tile){
      tile.classList.toggle("active",!!cat&&tile.getAttribute("data-pick-category")===cat);
      tile.setAttribute("aria-pressed",cat===tile.getAttribute("data-pick-category")?"true":"false");
    });
    document.querySelectorAll(".pay-tile").forEach(function(tile){
      tile.classList.toggle("active",!!pay&&tile.getAttribute("data-pick-payment")===pay);
    });
  }
  if(search)search.addEventListener("input",applyFilters);
  [categoryFilter,paymentFilter,cardFilter].forEach(function(el){if(el)el.addEventListener("change",applyFilters)});
  document.querySelectorAll(".category-tile").forEach(function(tile){
    tile.addEventListener("click",function(){
      if(!categoryFilter)return;
      var value=tile.getAttribute("data-pick-category");
      categoryFilter.value=categoryFilter.value===value?"":value;
      applyFilters();
      var list=document.getElementById("transactions");
      if(list&&list.scrollIntoView)list.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
  document.querySelectorAll(".pay-tile").forEach(function(tile){
    tile.addEventListener("click",function(){
      if(!paymentFilter)return;
      var value=tile.getAttribute("data-pick-payment");
      paymentFilter.value=paymentFilter.value===value?"":value;
      applyFilters();
      var list=document.getElementById("transactions");
      if(list&&list.scrollIntoView)list.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
  var clear=document.getElementById("txReset");
  if(clear)clear.addEventListener("click",function(){
    if(search)search.value="";
    if(categoryFilter)categoryFilter.value="";
    if(paymentFilter)paymentFilter.value="";
    if(cardFilter)cardFilter.value="";
    applyFilters();
  });
  document.querySelectorAll(".trend-switch").forEach(function(button){
    button.addEventListener("click",function(){
      var monthly=button.getAttribute("data-trend")==="months";
      var days=document.getElementById("trendDays"),months=document.getElementById("trendMonths");
      if(days)days.hidden=monthly;
      if(months)months.hidden=!monthly;
      document.querySelectorAll(".trend-switch").forEach(function(b){b.classList.toggle("active",b===button)});
    });
  });
  document.addEventListener("click",function(e){if(opened&&!opened.contains(e.target))reveal(opened,false)});
  })();</script></body></html>`;
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
  const category=canonicalCategory(fields.category);
  if(category==='其他' && !['其他','投資'].includes(String(fields.category||'').trim()))
    throw new Error('Merchant Type 請使用指定 12 個分類');
  const card=String(fields.card||'').trim();
  const hasPayment=Object.prototype.hasOwnProperty.call(fields,'paymentType');
  const hasRemark=Object.prototype.hasOwnProperty.call(fields,'remark');
  const typedMethod=hasPayment?String(fields.paymentType||'').trim():'';
  const paymentType=hasPayment?normalizePaymentType(typedMethod):(db.transactions[rowIndex].paymentType||'');
  // Any nonempty custom payment method is valid; PAYMENT_TYPES are suggestions only.
  const remark=hasRemark?String(fields.remark||'').trim().slice(0,800):(db.transactions[rowIndex].remark||'');
  if(!fm.fileExists(dbPath))throw new Error('找不到交易資料庫');
  const latest=JSON.parse(fm.readString(dbPath));
  if(!latest||!Array.isArray(latest.transactions))throw new Error('交易資料庫格式無效');
  const matchIndex=snapshot.id?latest.transactions.findIndex(t=>t.id===snapshot.id):rowIndex;
  const diskRow=latest.transactions[matchIndex];
  if(!diskRow)throw new Error('交易已不存在，請重新打開 Dashboard');
  if(JSON.stringify(diskRow)!==JSON.stringify(snapshot))throw new Error('交易已被其他操作修改；請重新開啟 Dashboard，避免覆蓋較新版本');
  const updated={...diskRow,date,transactionTime,merchant,category,originalCategory:category,card,currency,amount};
  if(hasPayment)updated.paymentType=paymentType;
  if(hasRemark)updated.remark=remark;
  const changed=['date','transactionTime','merchant','category','card','currency','amount','paymentType','remark'].some(k=>diskRow[k]!==updated[k]);
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
  form.message='Merchant Type：'+MERCHANT_TYPES.join('／')+'。\n付款類型可自由輸入（例如 Payme／AlipayHK／現金）。\n備註可空白；改動只寫入本機。';
  form.addTextField('日期／時間',current.transactionTime||current.date||'');
  form.addTextField('商戶',current.merchant||'');
  form.addTextField('Merchant Type（12 類）',categoryForDisplay(current)==='其他'?'':categoryForDisplay(current));
  form.addTextField('貨幣（HKD／USD…）',current.currency==='UNKNOWN'?'':current.currency);
  form.addTextField('金額（負數代表退款）',String(current.amount));
  form.addTextField('卡名／支付工具（可留空）',current.card||'');
  form.addTextField('付款類型（可留空）',paymentTypeOf(current));
  form.addTextField('Remark 備註（可留空）',current.remark||'');
  form.addAction('儲存修改');form.addCancelAction('取消');
  if(await form.presentAlert()!==0)return false;
  const fields={dateTime:form.textFieldValue(0),merchant:form.textFieldValue(1),
    category:form.textFieldValue(2),currency:form.textFieldValue(3),
    amount:form.textFieldValue(4),card:form.textFieldValue(5),
    paymentType:form.textFieldValue(6),remark:form.textFieldValue(7)};
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
    "id": "食飯",
    "label": "食飯",
    "color": "#ff9816",
    "icon": "utensils"
  },
  {
    "id": "飲品",
    "label": "飲品",
    "color": "#28cce0",
    "icon": "coffee"
  },
  {
    "id": "娛樂",
    "label": "娛樂",
    "color": "#f6ca20",
    "icon": "game"
  },
  {
    "id": "日用品",
    "label": "日用品",
    "color": "#26c970",
    "icon": "bottle"
  },
  {
    "id": "交通",
    "label": "交通",
    "color": "#c58056",
    "icon": "train"
  },
  {
    "id": "旅行",
    "label": "旅行",
    "color": "#c8f354",
    "icon": "plane"
  },
  {
    "id": "衣服",
    "label": "衣服",
    "color": "#426dff",
    "icon": "shirt"
  },
  {
    "id": "水電",
    "label": "水電",
    "color": "#12c8f4",
    "icon": "drop"
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
    coffee:'<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zm12 1h2a3 3 0 0 1 0 6h-2M8 3v2m4-2v2"/>',
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
.option select,.optional-fields input,.optional-fields textarea{display:block;width:100%;min-width:0;background:#282e35;color:#fff;border:1px solid #424b57;border-radius:11px;padding:9px 11px;font-size:14px}
.option select{min-height:45px}.optional-fields{display:grid;gap:6px;margin-top:12px}
.optional-fields label{font-size:12px;color:var(--label);margin-top:4px}
.optional-fields textarea{resize:vertical;min-height:56px;font-family:inherit}
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
<div class="field-line"><label for="manualMerchant">記錄</label><div class="center"><input class="line-input" type="text" maxlength="120" id="manualMerchant" placeholder="商戶（可留空）"></div></div>
<div class="field-line"><label for="manualAmount">支出</label><div class="moneyline">
  <select id="manualCurrency" class="currency" aria-label="貨幣">
  ${['HKD','USD','CNY','JPY','EUR','GBP','SGD','TWD','MOP','AUD'].map(c=>'<option value="'+c+'">'+c+'</option>').join('')}</select>
  <input id="manualAmount" class="amount" type="text" inputmode="decimal" placeholder="0" aria-label="金額" required></div></div>
<div class="options"><div class="option"><label for="manualTime">交易時間</label><input id="manualTime" type="time" value="${nowTime}"></div>
<div class="option"><label for="manualPaymentType">付款方式（可自訂）</label><input id="manualPaymentType" type="text" list="paymentSuggestions" maxlength="80" placeholder="現金／Payme／八達通…" value="現金">
<datalist id="paymentSuggestions">${[...new Set([...PAYMENT_TYPES,'Payme','AlipayHK','Apple Pay',...db.transactions.flatMap(t=>[t.paymentType||'',t.card||''])].filter(Boolean))].map(t=>`<option value="${esc(t)}"></option>`).join('')}</datalist></div></div>
<div class="optional-fields"><label for="manualCard">Card／付款工具（可留空）</label>
<input id="manualCard" type="text" maxlength="80" placeholder="例如 SOGO VISA／八達通" value="">
<label for="manualRemark">Remark／備註（可留空）</label>
<textarea id="manualRemark" maxlength="800" rows="2" placeholder="例如：午餐、同事聚餐、待報銷…"></textarea></div>
<h2>Merchant Type · 12 類</h2><input type="hidden" id="manualCategory" value="食飯">
<div class="categories">${catHTML}</div>
<p class="hint">只會記錄有效、非零金額；負數代表退款。外幣先以原幣儲存，之後可由主選單換算。Apple Numbers 已有資料列不會自動同步。</p>
<p id="manualError" class="error" role="alert"></p></form>
</main><div class="bottom"><button type="submit" form="manualForm" id="manualSave" class="submit">儲存支出</button></div>
<script>${scriptJS}</script></body></html>`;
}

function readManualFormWeb(web) {
  return web.evaluateJavaScript("(function(){var v=function(x){var el=document.getElementById(x);return el?String(el.value||''):'';};return {date:v('manualDate'),time:v('manualTime'),merchant:v('manualMerchant'),amount:v('manualAmount'),currency:v('manualCurrency'),card:v('manualCard'),paymentType:v('manualPaymentType'),remark:v('manualRemark'),category:v('manualCategory')};})()",false);
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
  const paymentType=normalizePaymentType(payload.paymentType||'')||paymentTypeFromCard(payload.card||'');
  const remark=String(payload.remark||'').trim().slice(0,800);
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
    merchantName:merchant,merchantType:category,card,paymentType,remark,source:'Manual'});
  if(!rec)throw new Error('無法轉換手動記帳資料');
  // Explicit user-selected category wins over automatic merchant keywords.
  rec.category=category;rec.originalCategory=category;rec.paymentType=paymentType;rec.remark=remark;rec.source='Manual';
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
// Adaptive widgets — progressive disclosure, purpose-built at each size.
// iPhone: small, medium, large; iPad: extraLarge (Apple WidgetKit/Scriptable).
// Chart drawing is native DrawContext; text and stacks remain scalable.
// Ref: docs/EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md.
// Expense Widget visual tokens shared by all system families (v3.17).
// v3.19 — clean-sheet native Scriptable Widget renderer.
// All widgets use one audited data model; only the presentational language
// changes by family. No WebView, network calls, remote fonts, asset dependencies.
const WC={
 bg:'#0C1220',surface:'#152039',surface2:'#1B2944',
 edge:'#263653',ink:'#F6F8FF',soft:'#BBC8DB',subtle:'#8F9DB5',
 violet:'#AE9BFA',mint:'#7CDBC1',amber:'#F6C278',negative:'#72DBB5'
};
function wText(parent,value,size=11,color=WC.soft,bold=false){
  const t=parent.addText(String(value));
  t.font=bold?Font.semiboldSystemFont(size):Font.systemFont(size);
  t.textColor=new Color(color);
  t.lineLimit=1;
  // Do not silently scale ordinary text below the 11pt accessibility target.
  t.minimumScaleFactor=size>18?0.75:1;
  return t;
}
function compactMoney(n){
  const value=Number(n)||0,abs=Math.abs(value),sign=value<0?'-':'';
  if(abs>=1000000)return sign+'HK$'+(abs/1000000).toFixed(1)+'m';
  if(abs>=10000)return sign+'HK$'+(abs/1000).toFixed(1)+'k';
  return sign+'HK$'+abs.toLocaleString('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function compactCurrency(t){
  if(Number.isFinite(t.amountHKD))return compactMoney(t.amountHKD);
  return (t.currency||'?')+' '+(Number.isFinite(Number(t.amount))?Number(t.amount).toFixed(2):'?');
}
function widgetSummary(){
  const now=today(),mon=monthStart(now),s7=dayBack(6),s14=dayBack(13);
  const byDay=Object.create(null),byMonth=Object.create(null);
  const cats=Object.create(null),pays=Object.create(null),catCount=Object.create(null),payCount=Object.create(null);
  // Gross positive charges are a valid denominator for donut/stacked shares;
  // net monthly spending remains positive charges minus refunds.
  const grossCat=Object.create(null),grossPay=Object.create(null);
  let gross=0,refundValue=0;
  let month=0,todayNet=0,week=0,monthCount=0,todayCount=0,unresolved=0,refunds=0;
  for(const t of db.transactions){
    if(!validDate(t.date)||!Number.isFinite(t.amountHKD)){unresolved++;continue;}
    const v=t.amountHKD,m=t.date.slice(0,7);
    byDay[t.date]=(byDay[t.date]||0)+v;byMonth[m]=(byMonth[m]||0)+v;
    if(t.date>=s7&&t.date<=now)week+=v;
    if(t.date===now)todayNet+=v;
    if(m!==mon)continue;
    month+=v;monthCount++;
    if(t.date===now)todayCount++;
    if(v>0)gross+=v;
    if(v<0){refunds++;refundValue-=v;}
    const cat=categoryForDisplay(t),pay=paymentTypeOf(t)||'未指定';
    cats[cat]=(cats[cat]||0)+v;pays[pay]=(pays[pay]||0)+v;
    catCount[cat]=(catCount[cat]||0)+1;payCount[pay]=(payCount[pay]||0)+1;
    if(v>0){grossCat[cat]=(grossCat[cat]||0)+v;grossPay[pay]=(grossPay[pay]||0)+v;}
  }
  const ranked=(totals,counts)=>Object.entries(totals).filter(([k])=>counts[k]>0)
    .sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  const recent=db.transactions.slice()
    .sort((a,b)=>String(b.transactionTime||b.date||b.createdAt||'')
      .localeCompare(String(a.transactionTime||a.date||a.createdAt||''))).slice(0,6);
  const sixMonths=Array.from({length:6},(_,i)=>{
    const key=monthsBack(5-i);
    return {label:key.slice(5)+'月',value:byMonth[key]||0};
  });
  const activeIn=from=>Object.keys(byDay).filter(k=>k>=from&&k<=now).length;
  const round=v=>Math.round(v*100)/100;
  return {month:round(month),today:round(todayNet),last7:round(week),
    txCount:monthCount,todayCount,monthOnlyToday:monthCount>0&&todayCount===monthCount,
    sevenActive:activeIn(s7),fourteenActive:activeIn(s14),
    byDay,monthlyCats:ranked(cats,catCount),monthlyPayments:ranked(pays,payCount),
    gross:round(gross),refundValue:round(refundValue),
    grossCats:ranked(grossCat,catCount),grossPayments:ranked(grossPay,payCount),
    sixMonths,recent,refunds,unresolved};
}
function chartPoints(byDay,count){
  return Array.from({length:count},(_,i)=>{
    const date=dayBack(count-i-1);
    return {label:date.slice(8),value:byDay[date]||0,
      active:Object.prototype.hasOwnProperty.call(byDay,date)};
  });
}
function makeBarChart(points,width,height){
  // Signed axis: refunds are drawn below zero; missing days never imply purchases.
  const canvas=new DrawContext();canvas.size=new Size(width,height);
  canvas.respectScreenScale=true;canvas.opaque=false;
  const values=points.map(x=>Number(x.value)||0);
  const positive=Math.max(0,...values),negative=Math.max(0,...values.map(x=>-x));
  const h=height-3,zero=negative>0?2+h*positive/Math.max(1,positive+negative):2+h;
  canvas.setFillColor(new Color(WC.edge));canvas.fillRect(new Rect(0,zero,width,1));
  const pitch=width/Math.max(1,points.length),bar=Math.min(11,Math.max(3,pitch*.56));
  values.forEach((v,i)=>{
    if(!v)return;
    const rise=v>0?(v/Math.max(1,positive))*Math.max(0,zero-2)
      :(-v/Math.max(1,negative))*Math.max(0,2+h-zero);
    const x=i*pitch+(pitch-bar)/2;
    canvas.setFillColor(new Color(v<0?WC.negative:WC.violet));
    canvas.fillRect(new Rect(x,v>0?zero-rise:zero,bar,Math.max(1,rise)));
  });
  return canvas.getImage();
}
function makeMiniBar(width,ratio,color=WC.violet){
  const c=new DrawContext();c.size=new Size(width,3);
  c.respectScreenScale=true;c.opaque=false;
  c.setFillColor(new Color(WC.edge));c.fillRect(new Rect(0,0,width,3));
  if(ratio>0){
    c.setFillColor(new Color(color));
    c.fillRect(new Rect(0,0,Math.max(1,Math.min(width,width*ratio)),3));
  }
  return c.getImage();
}
function addChart(parent,points,width,height){
  const image=parent.addImage(makeBarChart(points,width,height));
  image.imageSize=new Size(width,height);image.applyFittingContentMode();
  return image;
}
function sevenDayHeatImage(points,width){
  // Seven equal-width cells — NO misleading giant single-day spike.
  const c=new DrawContext();c.size=new Size(width,12);
  c.respectScreenScale=true;c.opaque=false;
  const maximum=Math.max(.01,...points.map(p=>Math.abs(p.value)));
  const pitch=width/7,box=Math.max(10,pitch-5);
  points.forEach((p,i)=>{
    const v=p.value;
    c.setFillColor(new Color(v<0?WC.mint:(v>0?WC.violet:(p.active?WC.amber:WC.edge))));
    const fraction=Math.abs(v)/maximum;
    const fill=v===0?3:Math.max(6,box*fraction);
    const start=i*pitch+(pitch-box)/2;
    c.fillRect(new Rect(start,2,box,8));
    if(v!==0&&fill<box){
      c.setFillColor(new Color(WC.bg));
      c.fillRect(new Rect(start+fill,2,box-fill,8));
    }
  });
  return c.getImage();
}
function addSevenDayStrip(parent,points,width){
  const i=parent.addImage(sevenDayHeatImage(points,width));
  i.imageSize=new Size(width,12);i.applyFittingContentMode();
  parent.addSpacer(2);
  const days=['日','一','二','三','四','五','六'];
  const row=parent.addStack();row.layoutHorizontally();
  points.forEach((p,idx)=>{
    const dt=dayBack(6-idx),date=new Date(+dt.slice(0,4),+dt.slice(5,7)-1,+dt.slice(8,10));
    const cell=row.addStack();cell.layoutVertically();cell.centerAlignContent();
    cell.size=new Size(width/7,0);
    const t=wText(cell,days[date.getDay()],11,idx===6?WC.violet:WC.subtle,idx===6);
    if(typeof t.centerAlignText==='function')t.centerAlignText();
  });
}
// v3.20 chart primitives (native DrawContext / Path; no WebView or external SVG).
const WCOL=['#AE9BFA','#7CDBC1','#F6C278','#71B9EF','#E3A0CB'];
function createChart(w,h){
  const c=new DrawContext();c.size=new Size(w,h);
  c.respectScreenScale=true;c.opaque=false;return c;
}
function displayImage(parent,image,w,h){
  const node=parent.addImage(image);node.imageSize=new Size(w,h);
  node.applyFittingContentMode();return node;
}
function makeStackedChart(items,width,height=11){
  const c=createChart(width,height),total=items.reduce((sum,x)=>sum+Math.max(0,x[1]),0);
  c.setFillColor(new Color(WC.edge));c.fillRect(new Rect(0,0,width,height));
  if(total<=0)return c.getImage();
  let x=0;
  items.forEach(([name,val],i)=>{
    const part=Math.max(0,val);if(!part)return;
    const next=Math.min(width,x+width*part/total);
    c.setFillColor(new Color(WCOL[i%WCOL.length]));
    c.fillRect(new Rect(x,0,Math.max(0,next-x),height));x=next;
  });
  return c.getImage();
}
function addStackedChart(parent,items,width,height=11){
  return displayImage(parent,makeStackedChart(items,width,height),width,height);
}
function donutParts(entries,max=4){
  const positive=entries.filter(x=>x[1]>0);
  if(positive.length<=max)return positive;
  return [...positive.slice(0,max-1),
    ['其他',positive.slice(max-1).reduce((a,x)=>a+x[1],0)]];
}
function makeDonutChart(items,size){
  const c=createChart(size,size),parts=donutParts(items);
  const total=parts.reduce((sum,x)=>sum+x[1],0);
  const mid=size/2,r=size*.47,hole=size*.29;
  c.setFillColor(new Color(WC.edge));
  c.fillEllipse(new Rect(mid-r,mid-r,r*2,r*2));
  if(total>0){
    let angle=-Math.PI/2;
    parts.forEach(([name,value],i)=>{
      const sweep=2*Math.PI*value/total,path=new Path();
      path.move(new Point(mid,mid));
      const steps=Math.max(2,Math.ceil(sweep/(Math.PI*2)*100));
      for(let j=0;j<=steps;j++){
        const at=angle+sweep*j/steps;
        path.addLine(new Point(mid+r*Math.cos(at),mid+r*Math.sin(at)));
      }
      path.closeSubpath();
      c.setFillColor(new Color(WCOL[i%WCOL.length]));c.addPath(path);c.fillPath();
      angle+=sweep;
    });
  }
  c.setFillColor(new Color(WC.bg));
  c.fillEllipse(new Rect(mid-hole,mid-hole,hole*2,hole*2));
  return c.getImage();
}
function addDonutChart(parent,items,size){
  return displayImage(parent,makeDonutChart(items,size),size,size);
}
function addDonutLegend(parent,entries,gross,count=3){
  const parts=donutParts(entries);
  if(!parts.length){wText(parent,'尚無消費',11,WC.subtle);return;}
  parts.slice(0,count).forEach(([name,amount],i)=>{
    const row=parent.addStack();row.layoutHorizontally();row.centerAlignContent();
    const dot=row.addStack();dot.size=new Size(5,5);dot.cornerRadius=2;
    dot.backgroundColor=new Color(WCOL[i%WCOL.length]);
    row.addSpacer(4);wText(row,String(name).slice(0,7),11,WC.soft);
    row.addSpacer(4);
    wText(row,gross>0?Math.round(amount/gross*100)+'%':'—',11,WC.ink,true);
  });
}
function recentTitle(t){
  const merchant=String(t.merchant||'').trim();
  if(merchant&&!/^(未提供商戶|unknown|null)$/i.test(merchant))return merchant;
  const category=categoryForDisplay(t),payment=paymentTypeOf(t);
  return [category&&category!=='未分類'?category:'交易',payment].filter(Boolean).join(' · ');
}
function paymentRemainder(s,n=2){
  if(s.monthlyPayments.length<=n)return null;
  const remain=Math.round((s.month-s.monthlyPayments.slice(0,n).reduce((a,p)=>a+p[1],0))*100)/100;
  return Math.abs(remain)>=.005?remain:null;
}
function widgetWidth(family){
  let screen=390;try{screen=Device.screenSize().width||390;}catch(_){}
  if(family==='small')return screen<=320?121:screen<=375?128:screen<=393?138:149;
  if(family==='extraLarge')return Math.max(440,Math.min(605,screen-132));
  return (screen<=320?292:screen<=375?321:screen<=393?338:screen<=414?360:364)-24;
}
function sectionLine(parent,title,right=''){
  const row=parent.addStack();row.layoutHorizontally();row.centerAlignContent();
  wText(row,title,11,WC.ink,true);
  row.addSpacer(4);
  if(right)wText(row,right,11,WC.subtle);
}
function widgetCard(parent,pad=7){
  const c=parent.addStack();c.layoutVertically();
  c.backgroundColor=new Color(WC.surface);c.cornerRadius=11;
  c.setPadding(pad,pad,pad,pad);
  return c;
}
function addSeparator(parent,width){
  const rule=parent.addStack();rule.size=new Size(width,1);
  rule.backgroundColor=new Color(WC.edge);
}
function addRankRows(parent,rows,count,width=120,showBars=true){
  const max=Math.max(1,...rows.map(r=>Math.abs(r[1])));
  if(!rows.length){wText(parent,'本月未有分類支出',11,WC.subtle);return 0;}
  rows.slice(0,count).forEach(([name,value],idx)=>{
    const row=parent.addStack();row.layoutHorizontally();row.centerAlignContent();
    wText(row,name.length>9?name.slice(0,8)+'…':name,11,WC.soft);
    row.addSpacer(4);wText(row,compactMoney(value),11,WC.ink,true);
    if(showBars){
      parent.addSpacer(2);
      const img=parent.addImage(makeMiniBar(width,Math.abs(value)/max,idx===0?WC.violet:WC.mint));
      img.imageSize=new Size(width,3);img.applyFittingContentMode();
    }
    if(idx<Math.min(count,rows.length)-1)parent.addSpacer(showBars?4:3);
  });
  return Math.min(count,rows.length);
}
function addPaymentRows(parent,rows,count){
  if(!rows.length){wText(parent,'未有付款方式',11,WC.subtle);return 0;}
  rows.slice(0,count).forEach(([name,amt],idx)=>{
    const item=parent.addStack();item.layoutHorizontally();item.centerAlignContent();
    const shown=String(name);wText(item,shown.length>13?shown.slice(0,12)+'…':shown,11,WC.soft);
    item.addSpacer(3);wText(item,compactMoney(amt),11,WC.ink,true);
    if(idx<count-1)parent.addSpacer(3);
  });
  return Math.min(count,rows.length);
}
function addRecentRows(parent,rows,count,labelMax=25){
  if(!rows.length){wText(parent,'暫無交易',11,WC.subtle);return 0;}
  rows.slice(0,count).forEach((t,idx)=>{
    const line=parent.addStack();line.layoutHorizontally();line.centerAlignContent();
    const label=recentTitle(t);
    wText(line,label.length>labelMax?label.slice(0,labelMax-1)+'…':label,11,WC.soft);
    line.addSpacer(4);wText(line,compactCurrency(t),11,t.amount<0?WC.mint:WC.ink,true);
    if(idx<count-1)parent.addSpacer(3);
  });
  return Math.min(count,rows.length);
}
function contextLine(s){
  if(s.monthOnlyToday)return s.todayCount+'筆交易均在今日';
  if(s.sevenActive>0)return '近7日 '+s.sevenActive+'個消費日';
  return '近7日未有交易';
}
function simpleHeader(widget,month,transactions,label){
  const row=widget.addStack();row.layoutHorizontally();row.centerAlignContent();
  wText(row,label||month+'月 · 消費',11,WC.soft,true);
  row.addSpacer(4);
  wText(row,transactions+'筆',11,WC.subtle);
}
function widgetPending(widget,s){
  if(s.unresolved)wText(widget,'⚠ '+s.unresolved+'筆日期／匯率待核對',11,WC.amber);
}
function buildWidget(family=config.widgetFamily||'medium'){
  const s=widgetSummary(),widget=new ListWidget();
  const quick=String(args.widgetParameter||'').trim().toLowerCase()==='quick';
  widget.backgroundColor=new Color(WC.bg);widget.spacing=0;
  const py=family.startsWith('accessory')?1:(family==='small'||family==='medium'?8:11);
  const px=family.startsWith('accessory')?2:family==='small'?10:12;
  widget.setPadding(py,px,py,px);
  widget.refreshAfterDate=new Date(Date.now()+30*60*1000);
  const base=URLScheme.forRunningScript();
  widget.url=base+(base.includes('?')?'&':'?')+(quick?'view=manual':'view=dashboard');
  if(family.startsWith('accessory')){
    if(family==='accessoryInline')wText(widget,'本月 '+compactMoney(s.month),11,WC.ink,true);
    else if(family==='accessoryCircular')wText(widget,compactMoney(s.month).replace('HK$','$'),12,WC.ink,true);
    else{
      wText(widget,'本月 '+compactMoney(s.month),12,WC.ink,true);
      wText(widget,'今日 '+compactMoney(s.today),11,WC.soft);
    }
    return widget;
  }
  const width=widgetWidth(family),month=Number(today().slice(5,7));
  if(family==='small'){
    simpleHeader(widget,month,s.txCount,quick?'＋ 手動記帳':month+'月 · 支出');
    widget.addSpacer(4);
    wText(widget,compactMoney(s.month),23,WC.ink,true);
    widget.addSpacer(4);
    sectionLine(widget,'最近7日',s.sevenActive+'日有紀錄');
    widget.addSpacer(2);
    addChart(widget,chartPoints(s.byDay,7),width,26);
    widget.addSpacer(4);
    const row=widget.addStack();row.layoutHorizontally();row.centerAlignContent();
    wText(row,'最多分類',11,WC.subtle);row.addSpacer(4);
    const best=s.grossCats[0];
    wText(row,best&&s.gross>0?best[0]+' '+Math.round(best[1]/s.gross*100)+'%':'暫無支出',
      11,WC.mint,true);
    return widget;
  }
  if(family==='medium'){
    const narrow=width<280;
    simpleHeader(widget,month,s.txCount,quick?'＋ 手動記帳':month+'月 · 趨勢');
    widget.addSpacer(3);
    const hero=widget.addStack();hero.layoutHorizontally();hero.centerAlignContent();
    wText(hero,compactMoney(s.month),narrow?21:23,WC.ink,true);
    hero.addSpacer(6);
    wText(hero,s.monthOnlyToday?'全部在今日':s.fourteenActive+'個消費日',11,WC.mint);
    widget.addSpacer(3);
    sectionLine(widget,'最近14日 · 每日淨額');
    widget.addSpacer(2);
    addChart(widget,chartPoints(s.byDay,14),width,narrow?23:32);
    widget.addSpacer(3);
    addStackedChart(widget,donutParts(s.grossCats),width,9);
    widget.addSpacer(3);
    const footer=widget.addStack();footer.layoutHorizontally();footer.centerAlignContent();
    const category=s.grossCats[0];
    wText(footer,'分類',11,WC.subtle);footer.addSpacer(5);
    wText(footer,category&&s.gross?category[0]+' '+Math.round(category[1]/s.gross*100)+'%':'暫無支出',
      11,WC.violet,true);
    footer.addSpacer();
    const payment=s.grossPayments[0];
    if(payment)wText(footer,String(payment[0]).slice(0,10),11,WC.muted);
    return widget;
  }
  if(family==='large'){
    const narrow=width<290,col=Math.floor((width-8)/2);
    simpleHeader(widget,month,s.txCount,quick?'＋ 手動記帳':'支出分析 · '+month+'月');
    widget.addSpacer(4);
    const hero=widget.addStack();hero.layoutHorizontally();hero.centerAlignContent();
    wText(hero,compactMoney(s.month),23,WC.ink,true);
    hero.addSpacer(7);
    wText(hero,s.refunds?'退款 '+s.refunds+'筆':'近7日 '+s.sevenActive+'日',11,WC.mint);
    widget.addSpacer(4);
    sectionLine(widget,'最近14日 · 淨支出');
    widget.addSpacer(2);
    addChart(widget,chartPoints(s.byDay,14),width,narrow?34:44);
    widget.addSpacer(7);
    const panels=widget.addStack();panels.layoutHorizontally();panels.spacing=8;
    const left=panels.addStack();left.layoutVertically();left.size=new Size(col,0);
    sectionLine(left,'支出分類');
    left.addSpacer(5);
    const ring=left.addStack();ring.layoutHorizontally();ring.centerAlignContent();
    const size=narrow?59:75;
    addDonutChart(ring,s.grossCats,size);
    ring.addSpacer(4);
    const legend=ring.addStack();legend.layoutVertically();legend.spacing=2;
    addDonutLegend(legend,s.grossCats,s.gross,narrow?2:3);
    const right=panels.addStack();right.layoutVertically();right.size=new Size(col,0);
    sectionLine(right,'付款構成');
    right.addSpacer(8);
    addStackedChart(right,donutParts(s.grossPayments),col,12);
    right.addSpacer(6);
    addPaymentRows(right,s.grossPayments,narrow?2:3);
    widget.addSpacer(7);
    sectionLine(widget,'最近交易','最近'+Math.min(s.recent.length,narrow?1:2)+'筆');
    widget.addSpacer(3);
    addRecentRows(widget,s.recent,narrow?1:2,narrow?13:21);
    if(s.unresolved){widget.addSpacer(4);widgetPending(widget,s);}
    return widget;
  }
  // iPad Extra Large: four complementary charts with transparent denominators.
  simpleHeader(widget,month,s.txCount,quick?'＋ 手動記帳':'財務分析 · '+month+'月');
  widget.addSpacer(5);
  const hero=widget.addStack();hero.layoutHorizontally();hero.centerAlignContent();
  wText(hero,compactMoney(s.month),25,WC.ink,true);
  hero.addSpacer(12);
  wText(hero,'支出 '+compactMoney(s.gross),11,WC.soft);
  hero.addSpacer(10);
  wText(hero,'退款 '+compactMoney(s.refundValue),11,WC.mint);
  widget.addSpacer(8);
  const panels=widget.addStack();panels.layoutHorizontally();panels.spacing=12;
  const leftW=Math.floor(width*.52),rightW=width-leftW-12;
  const left=panels.addStack();left.layoutVertically();left.size=new Size(leftW,0);
  sectionLine(left,'最近30日每日淨額');
  left.addSpacer(4);addChart(left,chartPoints(s.byDay,30),leftW,60);
  left.addSpacer(7);
  sectionLine(left,'最近6個月淨額');
  left.addSpacer(4);addChart(left,s.sixMonths,leftW,42);
  const right=panels.addStack();right.layoutVertically();right.size=new Size(rightW,0);
  sectionLine(right,'分類 · 正向支出');
  right.addSpacer(5);
  const cat=right.addStack();cat.layoutHorizontally();cat.centerAlignContent();
  addDonutChart(cat,s.grossCats,84);cat.addSpacer(8);
  const legend=cat.addStack();legend.layoutVertically();legend.spacing=3;
  addDonutLegend(legend,s.grossCats,s.gross,4);
  right.addSpacer(7);
  sectionLine(right,'付款構成 · 正向支出');
  right.addSpacer(4);
  addStackedChart(right,donutParts(s.grossPayments),rightW,12);
  right.addSpacer(4);
  addPaymentRows(right,s.grossPayments,2);
  widget.addSpacer(8);
  sectionLine(widget,'最近六筆交易');
  widget.addSpacer(4);
  const recent=widget.addStack();recent.layoutHorizontally();recent.spacing=10;
  for(let i=0;i<3;i++){
    const col=recent.addStack();col.layoutVertically();
    col.size=new Size(Math.floor((width-20)/3),0);
    addRecentRows(col,s.recent.slice(i*2,i*2+2),2,13);
  }
  if(s.unresolved){widget.addSpacer(4);widgetPending(widget,s);}
  return widget;
}

async function previewWidget(){
  const choices=[
    'Small — 7日微型柱圖＋分類',
    'Medium — 14日趨勢＋分類比例',
    'Large — 趨勢＋環形圖＋付款構成'
  ];
  let isPad=false;try{isPad=Device.isPad();}catch(_){}
  if(isPad)choices.push('Extra Large — iPad 四圖分析');
  const pick=new Alert();pick.title='預覽記帳 Widget';
  choices.forEach(name=>pick.addAction(name));pick.addCancelAction('取消');
  const choice=await pick.presentSheet();if(choice<0)return;
  const family=['small','medium','large','extraLarge'][choice];
  const widget=buildWidget(family);
  if(choice===0)await widget.presentSmall();
  else if(choice===1)await widget.presentMedium();
  else if(choice===2)await widget.presentLarge();
  else if(choice===3)await widget.presentExtraLarge();
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
    version:'3.20.0',status,receipt,
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
    const message='[EXPENSE-HK-v3.20.0] 未入帳\n'+reason+'\n接收來源：'+source+'\n接收：'+received+'\n解析：'+lastParseMethod+'\n沒有修改交易資料庫。';
    console.log('[ExpenseTrackerHK v3.20.0] '+reason+' | '+received);
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
  const message=`[EXPENSE-HK-v3.20.0] ${status}\n磁碟核實：${check.verified} 筆，資料庫現有 ${check.total} 筆\n接收來源：${source}\n接收：${received}\n解析：${lastParseMethod}\n識別金額：${amounts}\n待換算外幣：${pendingFX} 筆（不阻塞本次入帳）\n日期待核對 ${result.missingDate} 筆，貨幣待核對 ${result.unknownCurrency} 筆`;
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
  const header=['ID','日期','交易時間','原幣金額','原幣','HKD估算','匯率','匯率日期','匯率來源','匯率狀態','消費類別','商戶','信用卡','原始類別','匯入時間','付款類型','Remark'];
  const csv='\ufeff'+[header,...db.transactions.map(t=>[t.id,t.date||'',t.transactionTime||'',t.amount,t.currency,t.amountHKD??'',t.fxRate??'',t.fxDate||'',t.fxSource||'',t.fxStatus||'',t.category,t.merchant,t.card,t.originalCategory||'',t.createdAt||'',paymentTypeOf(t),t.remark||''])].map(r=>r.map(csvValue).join(',')).join('\r\n');
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
  // URLScheme direct-launch routes. Only inspected for in-app opening,
  // AFTER the entrypoint has already prioritized valid Shortcut/Wallet data.
  const view=args.queryParameters&&args.queryParameters.view;
  if(view==='manual'){await addManual();return;}
  if(view==='dashboard'){await dashboard();return;}
  const menu=new Alert();menu.title='Expense Tracker HK';menu.message=`共 ${db.transactions.length} 筆交易。所有資料只儲存在本機。`;
  menu.addAction('📊 睇 Dashboard');menu.addAction('📋 匯入剪貼簿記錄');menu.addAction('➕ 手動記帳');menu.addAction('🛠 修正待核對交易');menu.addAction('🔄 重試外幣換算');menu.addAction('📤 匯出 CSV + JSON 備份');menu.addAction('👀 預覽 Widget 尺寸');menu.addAction('🧪 查看 Shortcuts 記帳紀錄');menu.addAction('✏️ 編輯交易');menu.addAction('🗑️ 刪除交易');menu.addAction('🔗 複製一鍵記帳網址');menu.addCancelAction('關閉');
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
  if(choice===10){
    const base=URLScheme.forRunningScript();
    const link=base+(base.includes('?')?'&':'?')+'view=manual';
    Pasteboard.copyString(link);
    await note('快速記帳連結已複製','喺「捷徑」建立新 Shortcut：URL → 開啟 URL，貼上連結；再加入主畫面。\n\n唔需要修改原有 Tap Card Automation。');
  }
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
  // Quick-launch control token can arrive either via Run Script's blue Parameter
  // (args.shortcutParameter) OR its expanded Texts list (args.plainTexts).
  // Only EXACTLY one nonblank Texts item with no Parameter qualifies as a command.
  // A real nonblank Shortcut Parameter, especially a Wallet Dictionary, always
  // takes precedence over Texts so an automated purchase can't be intercepted.
  const manualToken='EXPENSE_QUICK_MANUAL';
  const nonEmptyTexts=Array.isArray(args.plainTexts)
    ? args.plainTexts.map(t=>String(t==null?'':t).trim()).filter(Boolean)
    : [];
  const quickFromParameter=typeof input==='string' && input.trim()===manualToken;
  const quickFromTexts=!hasInput && nonEmptyTexts.length===1 &&
    nonEmptyTexts[0]===manualToken;
  const shortcutQuick=quickFromParameter||quickFromTexts;
  const requestedView=String(args.queryParameters&&args.queryParameters.view||'').trim().toLowerCase();
  if (shortcutQuick) {
    __expensePhase = '一鍵手動記帳';
    const source=quickFromTexts?'Texts':'Parameter';
    if (!config.runsInApp){
      recordShortcutAttempt('quick_requires_app',{inputType:'quick_manual',source});
      emitShortcutReceipt('[EXPENSE-HK-v3.20.0] 快速記帳指令已收到（'+source+'），但 Run In App 未開啟；請在 Shortcut 開啟 Run In App。','quick_requires_app');
    }else{
      recordShortcutAttempt('quick_opened',{inputType:'quick_manual',source});
      await addManual();
    }
  } else if (hasInput || hasTextFallback) {
    // Existing Wallet / Apple Intelligence Dictionary imports always take priority.
    __expensePhase = '處理 Shortcuts 記帳';
    await importData(input, false);
  } else if (requestedView==='manual' || requestedView==='dashboard'){
    // A genuine Scriptable deep link has no transaction input. Route BEFORE
    // checking config.runsInApp, otherwise URL invocations can be suppressed.
    __expensePhase = 'URL 快速開啟 '+requestedView;
    await (requestedView==='manual'?addManual():dashboard());
  } else if (config.runsWithSiri || config.runsInActionExtension || !config.runsInApp) {
    __expensePhase = 'Shortcuts 無輸入';
    recordShortcutAttempt('no_input',{inputType:'none',hasShortcutParameter:false});
    emitShortcutReceipt('[EXPENSE-HK-v3.20.0] 未入帳\nShortcut Parameter 同 Texts 都冇資料。','no_input');
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
      JSON.stringify({version:'3.20.0',lastAttemptAt:new Date().toISOString(),
        stage:'error',phase:__expensePhase,error:message.slice(0,250)},null,2));
  } catch(_) {}
  try { Script.setShortcutOutput({version:'3.20.0',status:'error',receipt:'[EXPENSE-HK-v3.20.0] 記帳失敗（未確認儲存）\n階段：' + __expensePhase + '\n錯誤：' + message,shouldAppendNumbers:false,requiresBatchSync:false,numbersRow:[],numbersRows:[],transactionId:'',localStored:false}); } catch (_) {}
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