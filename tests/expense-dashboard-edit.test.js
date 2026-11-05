// Offline regression tests for the Scriptable Dashboard transaction editor.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const source=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',source]);
const script=fs.readFileSync(source,'utf8');
const cut=script.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000,'Script entry boundary missing');
const dbPath='/local/ExpenseTrackerHK/transactions.json';
const tx={id:'example-1',date:'2026-11-04',transactionTime:'2026-11-04T20:33:28',
 amount:57,currency:'HKD',merchant:'Example Merchant',category:'餐飲',
 originalCategory:'Restaurants',card:'SAMPLE CARD',createdAt:'2026-11-04T12:33:28Z',
 source:'Shortcut',amountHKD:57,fxRate:1,fxDate:'2026-11-04',fxStatus:'native',fxSource:'original HKD'};
const disk=new Map([[dbPath,JSON.stringify({version:1,transactions:[tx]})]]);
let writes=0;
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
 createDirectory:()=>{},readString:p=>disk.get(p),
 writeString:(p,s)=>{writes++;disk.set(p,s)}};
const ctx={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},
 config:{runsInApp:true,runsInWidget:false},args:{},console};
vm.createContext(ctx);
const testScript='(async()=>{\n'+script.slice(0,cut)+
 '\nreturn {applyDashboardEdit,dashboardHTML,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
(async()=>{
 const state=await vm.runInContext(testScript,ctx);
 const row=()=>JSON.parse(disk.get(dbPath)).transactions[0];
 const snapshot=()=>JSON.parse(JSON.stringify(row()));
 const fields={dateTime:'20261105_093014',merchant:'Fixed Merchant',category:'交通',
   currency:'USD',amount:'-9.60',card:'New Card'};
 assert.equal(state.applyDashboardEdit(0,snapshot(),fields),true);
 let t=row();
 assert.equal(t.id,'example-1');assert.equal(t.createdAt,tx.createdAt);assert.equal(t.source,'Shortcut');
 assert.equal(t.transactionTime,'2026-11-05T09:30:14');
 assert.equal(t.amount,-9.6);assert.equal(t.currency,'USD');assert.equal(t.category,'交通');
 assert.equal(t.fxStatus,'pending');assert.equal(t.amountHKD,null);
 assert.equal(t.merchant,'Fixed Merchant');assert.equal(t.card,'New Card');
 assert.ok(t.editedAt);assert.equal(JSON.parse(disk.get(dbPath)).transactions.length,1);
 const previous=JSON.stringify(t),count=writes;
 assert.equal(state.applyDashboardEdit(0,snapshot(),fields),false,'No-op must not write');
 assert.equal(writes,count);
 for(const amount of [0,'0','0.00','',null,'abc']){
   assert.throws(()=>state.applyDashboardEdit(0,snapshot(),{...fields,amount}),/金額/);
   assert.equal(JSON.stringify(row()),previous,'Invalid amount must not modify disk');
 }
 assert.throws(()=>state.applyDashboardEdit(0,snapshot(),{...fields,dateTime:'20261105_999999'}),/時間|日期/);
 assert.throws(()=>state.applyDashboardEdit(0,snapshot(),{...fields,dateTime:'2026-02-31'}),/日期/);
 assert.equal(JSON.stringify(row()),previous);
 assert.throws(()=>state.applyDashboardEdit(50,snapshot(),fields),/索引|不存在/);
 const oldSnapshot=snapshot();
 disk.set(dbPath,JSON.stringify({version:1,transactions:[{...oldSnapshot,merchant:'Changed elsewhere'}]}));
 assert.throws(()=>state.applyDashboardEdit(0,oldSnapshot,fields),/其他操作修改/);
 disk.set(dbPath,JSON.stringify({version:1,transactions:[JSON.parse(previous)]}));
 const current=snapshot();
 const appended={...current,id:'newer-2',merchant:'Concurrent Record'};
 disk.set(dbPath,JSON.stringify({version:1,transactions:[current,appended]}));
 assert.equal(state.applyDashboardEdit(0,current,{...fields,dateTime:'2026-11-06',
   amount:'57',currency:'HKD',card:'',merchant:'',category:''}),true);
 t=row();
 assert.equal(t.date,'2026-11-06');assert.equal(t.transactionTime,null);
 assert.equal(t.amountHKD,57);assert.equal(t.fxStatus,'native');assert.equal(t.fxRate,1);
 assert.equal(t.merchant,'未提供商戶');assert.equal(t.category,'未分類');
 assert.equal(JSON.parse(disk.get(dbPath)).transactions.length,2,'Concurrent append must survive edit');
 const html=state.dashboardHTML('修改完成');
 assert.ok(html.includes('https://expense-editor.invalid/edit?row=0'));
 assert.ok(html.includes('id="txSearch"'));assert.ok(html.includes('✏️ 編輯'));
 assert.ok(html.includes('save-flash'));
 assert.ok(html.includes('href="https://expense-editor.invalid/edit?row=1"'));
 assert.ok(html.includes('已加入 Apple Numbers'));
 console.log('PASS: dashboard editing, row links, all-record search, date, amount, FX, concurrency, no-op and persistence');
})().catch(e=>{console.error(e);process.exitCode=1;});
