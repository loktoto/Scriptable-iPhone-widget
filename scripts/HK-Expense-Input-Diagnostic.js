// HK Expense Input Diagnostic v1.0
// Read-only. Does not save, upload, or modify any transactions.
// Temporarily use in the existing Shortcut's Run Script action,
// with the SAME model Response variable as Shortcut Parameter.

function plain(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string') {
    const s = x.trim();
    if (!s || /^(null|undefined|none)$/i.test(s)) return null;
    return s;
  }
  if (typeof x !== 'object' || Array.isArray(x)) return null;
  for (const key of ['content','value','number','text','string']) {
    if (Object.prototype.hasOwnProperty.call(x,key)) {
      const result = plain(x[key]);
      if (result !== null) return result;
    }
  }
  return null;
}
function amountOf(item, depth=0) {
  if (depth > 6 || item == null) return null;
  if (Array.isArray(item)) {
    for (const el of item) {
      const v = amountOf(el,depth+1);
      if (v !== null) return v;
    }
    return null;
  }
  if (typeof item === 'string') {
    const s=item.trim();
    try { return amountOf(JSON.parse(s),depth+1); } catch(_) {}
    const match=s.match(/(?:^|[,{\r\n]\s*)["']?(?:amount|Amount|金額)["']?\s*[:：=]\s*(?:["']?([+-]?\d+(?:\.\d+)?)["']?|\{\s*["']?content["']?\s*[:：]\s*["']?([+-]?\d+(?:\.\d+)?))/i);
    if(match) {
      const n=Number(match[1]||match[2]);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  if (typeof item !== 'object') return null;
  for (const key of Object.keys(item)) {
    if (['amount','transactionamount','totalamount','金額','付款金額','消費金額'].includes(key.toLowerCase())) {
      const p=plain(item[key]);
      const n=Number(p);
      if(p!==null && Number.isFinite(n)) return n;
    }
  }
  for (const key of Object.keys(item)) {
    if (['response','result','output','content','data','text','payload','records','transactions'].includes(key.toLowerCase())) {
      const n=amountOf(item[key],depth+1);
      if(n!==null) return n;
    }
  }
  return null;
}
function keysOf(input) {
  if (input===null || input===undefined) return '沒有參數';
  if (Array.isArray(input)) return 'Array ['+input.length+']';
  if (typeof input==='object') return 'Dictionary keys: '+Object.keys(input).slice(0,12).join(', ');
  return typeof input+' ('+String(input).length+' characters)';
}
const param=args.shortcutParameter;
const textExtras=Array.isArray(args.plainTexts) ? args.plainTexts : [];
let source='shortcutParameter';
let input=param;
if ((input===null || input===undefined || input==='') && textExtras.length) {
  input=textExtras[0];source='plainTexts[0]';
}
const detected=amountOf(input);
const isValid=detected!==null && detected!==0;
const fm=FileManager.local();
const path=fm.joinPath(fm.joinPath(fm.documentsDirectory(),'ExpenseTrackerHK'),'transactions.json');
let dbInfo='檔案不存在';
let matchInfo='未能核對';
try {
  if(fm.fileExists(path)) {
    const db=JSON.parse(fm.readString(path));
    if(Array.isArray(db.transactions)) {
      dbInfo='存在，共 '+db.transactions.length+' 筆';
      const matches=db.transactions.filter(t=>
        t.date==='2026-11-03' && Number(t.amount)===227 && t.currency==='HKD'
      );
      matchInfo=matches.length+' 筆 2026-11-03 HKD 227 的紀錄';
    } else dbInfo='存在，但資料結構異常';
  }
} catch(e) { dbInfo='讀取失敗：'+String(e.message||e).slice(0,180); }
const report=[
  'Expense Input Diagnostic v1.0 — 只讀',
  '執行 Script：'+(typeof Script.name==='function'?Script.name():'unknown'),
  '接收來源：'+source,
  '接收類型：'+keysOf(input),
  '辨認 Amount：'+(detected===null?'找不到':String(detected)),
  '允許入帳：'+(isValid?'是':'否（0／空／無效）'),
  '本機資料庫：'+dbInfo,
  'HK$227 紀錄：'+matchInfo,
  '環境：widget='+(config.runsInWidget===true)+' / app='+(config.runsInApp===true)+' / Siri='+(config.runsWithSiri===true),
  '未寫入或修改任何資料'
].join('\n');
console.log(report);
Script.setShortcutOutput(report);
Script.complete();
