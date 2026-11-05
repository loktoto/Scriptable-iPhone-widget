// Offline Scriptable integration test — visual manual expense form.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const file=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',file]);
const source=fs.readFileSync(file,'utf8');
const cut=source.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000,'Scriptable entry-point boundary missing');
const dbPath='/local/ExpenseTrackerHK/transactions.json';
const disk=new Map([[dbPath,JSON.stringify({version:1,transactions:[]})]]);
let writes=0;
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),createDirectory:()=>{},
 readString:p=>disk.get(p),writeString:(p,c)=>{writes++;disk.set(p,c)}};
const ctx={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},
 args:{},config:{runsInApp:true,runsInWidget:false},console};
vm.createContext(ctx);
const harness='(async()=>{\n'+source.slice(0,cut)+
 '\nreturn {manualFormHTML,saveManualForm,dashboardHTML,readManualFormWeb,MANUAL_CATEGORIES};\n}\nreturn await runExpenseTrackerHK();\n})()';
const entries=()=>JSON.parse(disk.get(dbPath)).transactions;
function fields(patch={}){
 return {date:'2026-11-05',time:'09:44',merchant:'Example Cash Market',
  amount:'57',currency:'HKD',card:'現金',category:'餐飲',...patch};
}
(async()=>{
 const app=await vm.runInContext(harness,ctx);
 const nonce='1730800000000-a1234567';
 const html=app.manualFormHTML(nonce,'已儲存');
 assert.ok(html.includes('手動支出記錄'));
 assert.ok(html.includes('https://expense-editor.invalid/manual-save'));
 assert.ok(html.includes('https://expense-editor.invalid/manual-back'));
 assert.ok(html.includes('id="manualDate"'));
 assert.ok(html.includes('id="manualAmount"'));
 assert.ok(html.includes('id="manualCurrency"'));
 assert.ok(html.includes('id="manualCard"'));
 assert.ok(html.includes('id="manualCategory"'));
 assert.ok(html.includes('已儲存'));
 assert.equal(app.MANUAL_CATEGORIES.length,12);
 assert.equal((html.match(/class="category(?: selected)?"/g)||[]).length,12);
 assert.ok(html.includes('grid-template-columns:repeat(3'));
 assert.ok(html.includes('touch')===false || html.includes('type="time"'));
 const script=/\<script>([\s\S]*?)\<\/script>/.exec(html);
 assert.ok(script,'Interactive form script missing');
 new vm.Script(script[1]);
 assert.ok(app.dashboardHTML().includes('＋ 手動記帳'));
 assert.ok(app.dashboardHTML().includes('https://expense-editor.invalid/manual-open'));
 // Only a numeric nonzero amount can be entered, including negative refunds.
 const row=app.saveManualForm(fields(),nonce);
 assert.equal(row.status,'saved');
 assert.equal(entries().length,1);
 assert.equal(entries()[0].amount,57);
 assert.equal(entries()[0].currency,'HKD');
 assert.equal(entries()[0].card,'現金');
 assert.equal(entries()[0].date,'2026-11-05');
 assert.equal(entries()[0].transactionTime,'2026-11-05T09:44:00');
 assert.equal(entries()[0].category,'餐飲');
 assert.equal(entries()[0].source,'Manual');
 assert.equal(entries()[0].amountHKD,57);
 assert.ok(entries()[0].id.startsWith('external:manual-form:'));
 assert.ok(disk.has('/local/ExpenseTrackerHK/transactions.previous.json'));
 const afterWrite=writes;
 const duplicate=app.saveManualForm(fields(),nonce);
 assert.equal(duplicate.status,'duplicate');
 assert.equal(entries().length,1);
 assert.equal(writes,afterWrite,'Repeated submission must not save again');
 const second=app.saveManualForm(fields({amount:'-9.6',category:'交通',
  currency:'USD',card:'八達通',merchant:'Metro Shop'}),'1730800000001-b9876543');
 assert.equal(second.status,'saved');
 assert.equal(entries().length,2);
 assert.equal(entries()[1].amount,-9.6);
 assert.equal(entries()[1].category,'交通');
 assert.equal(entries()[1].amountHKD,null);
 assert.equal(entries()[1].fxStatus,'pending');
 // Explicit category overrides a merchant-rule match.
 app.saveManualForm(fields({merchant:'MTR',category:'娛樂'}),'1730800000002-c1234567');
 assert.equal(entries()[2].category,'娛樂');
 // A concurrent Shortcut record must not be overwritten by the form.
 const latest=JSON.parse(disk.get(dbPath));
 latest.transactions.push({id:'external:shortcut-new',date:'2026-11-05',amount:7,
  currency:'HKD',amountHKD:7,merchant:'Concurrent Purchase',category:'餐飲'});
 disk.set(dbPath,JSON.stringify(latest));
 app.saveManualForm(fields({amount:'8'}),'1730800000003-d1234567');
 assert.ok(entries().some(t=>t.id==='external:shortcut-new'));
 assert.equal(entries().length,5);
 const saved=JSON.stringify(entries());
 const count=writes;
 const bad=[
  fields({amount:''}),fields({amount:0}),fields({amount:'0.00'}),
  fields({amount:'abc'}),fields({amount:null}),
  fields({date:'2026-02-31'}),fields({date:'2025-13-05'}),
  fields({time:'25:30'}),fields({currency:'ZZZ'}),
  fields({category:'無效類別'})
 ];
 for(let i=0;i<bad.length;i++){
   assert.throws(()=>app.saveManualForm(bad[i], '173080000004'+i+'-e1234567'));
   assert.equal(JSON.stringify(entries()),saved);
 }
 assert.equal(writes,count,'Invalid data must not modify disk');
 const output=await app.readManualFormWeb({
  evaluateJavaScript:async (source,callback)=>{
   assert.ok(source.includes("manualAmount"));
   assert.equal(callback,false);
   return fields({card:'轉數快 FPS'});
  }
 });
 assert.equal(output.card,'轉數快 FPS');
 console.log('PASS: 12 categories, HTML/JS, currency, cash/FPS, date/time, refund, ID, duplicate, pending FX, concurrent writes, invalid amounts and local disk');
})().catch(error=>{console.error(error);process.exitCode=1;});