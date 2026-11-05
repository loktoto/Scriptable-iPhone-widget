// Standalone integration tests: Scriptable is mocked; no live HTTP.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const source=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',source]);
const script=fs.readFileSync(source,'utf8');
const dbPath='/local/ExpenseTrackerHK/transactions.json';
const auditPath='/local/ExpenseTrackerHK/last-shortcut-run.json';
function store(rows=[]){const m=new Map();if(rows.length)m.set(dbPath,JSON.stringify({version:1,transactions:rows}));return m;}
async function exec(input,disk,texts=[],queryParameters={}){
 let output=null,complete=false,requests=0;
 const fm={
  documentsDirectory:()=>'/local',
  joinPath:(a,b)=>a+'/'+b,
  fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
  createDirectory:()=>{},readString:p=>disk.get(p),writeString:(p,s)=>disk.set(p,s)
 };
 const context={
  FileManager:{local:()=>fm},
  Script:{name:()=> 'Expense',setShortcutOutput:s=>output=s,complete:()=>complete=true},
  config:{runsInWidget:false,runsWithSiri:true,runsInApp:false,runsInActionExtension:false},
  args:{shortcutParameter:input,plainTexts:texts,queryParameters},
  Request:class {constructor(){requests++}async loadJSON(){return new Promise(()=>{})}},
  console:{log:()=>{},warn:()=>{},error:console.error}
 };
 vm.createContext(context);
 const job=vm.runInContext('(async()=>{\n'+script+'\n})()',context);
 const status=await Promise.race([
  job.then(()=>'done'),
  new Promise(resolve=>setTimeout(()=>resolve('timeout'),1100))
 ]);
 assert.equal(status,'done','Siri/Shortcuts import must never block on FX');
 assert.equal(complete,true);
 return {output,requests,rows:JSON.parse(disk.get(dbPath)||'{"transactions":[]}').transactions,audit:disk.has(auditPath)?JSON.parse(disk.get(auditPath)):null};
}
(async()=>{
 let count=0;const mark=()=>count++;
 const entry={merchantName:'Demo Restaurant',merchantType:'Restaurants',amount:57,currency:'HKD',card:'SAMPLE CARD',date:'20261104_203328'};
 let db=store(),a=await exec(entry,db);
 assert.match(a.output.receipt,/\[EXPENSE-HK-v3\.15\.0\] 已儲存 1 筆/);
 assert.match(a.output.receipt,/磁碟核實：1 筆/);
 assert.equal(a.requests,0);assert.equal(a.rows[0].amount,57);
 assert.equal(a.output.shouldAppendNumbers,true);
 assert.equal(a.audit.stage,'saved');
 assert.equal(a.audit.version,'3.15.0');
 assert.equal(a.output.status,'saved');
 assert.equal(a.output.numbersRow.length,6);
 assert.equal(a.output.numbersRow[2],'Demo Restaurant');
 assert.equal(a.output.numbersRow[5],57);
 assert.equal(a.rows[0].category,'食飯');assert.equal(a.rows[0].date,'2026-11-04');mark();
 a=await exec(entry,db);
 assert.match(a.output.receipt,/已存在 1 筆/);assert.equal(a.rows.length,1);
 assert.equal(a.output.shouldAppendNumbers,false);
 assert.equal(a.output.status,'duplicate');
 assert.equal(a.audit.stage,'duplicate');mark();
 a=await exec(JSON.stringify(entry),store());assert.equal(a.rows.length,1);mark();
 a=await exec(entry,store(),[],{view:'manual'});
 assert.equal(a.rows.length,1,'Wallet Dictionary must still be imported even when quick-launch URL parameter is present');
 assert.equal(a.output.status,'saved');assert.equal(a.requests,0);mark();
 a=await exec({response:JSON.stringify(entry)},store());assert.equal(a.rows.length,1);mark();
 a=await exec({...entry,amount:{content:'9.60',uuid:'00000000-0000-4000-8000-000000000000'}},store());
 assert.equal(a.rows[0].amount,9.6);mark();
 a=await exec({...entry,amount:-57},store());assert.equal(a.rows[0].amount,-57);mark();
 for(const amount of [0,'0.00','',null,'n/a','undefined']){
  a=await exec({...entry,amount},store());assert.equal(a.rows.length,0);
  assert.match(a.output.receipt,/未入帳/);
  assert.equal(a.output.shouldAppendNumbers,false);
  assert.equal(a.audit.stage,'skipped');mark();
 }
 a=await exec({...entry,merchantName:'',merchantType:'null',date:'',card:''},store());
 assert.equal(a.rows[0].date,null);assert.equal(a.rows[0].category,'未分類');mark();
 const past=[{id:'historical',date:'2026-11-03',amount:5,currency:'USD',fxStatus:'pending',merchant:'Demo Store'}];
 a=await exec(entry,store(past));assert.equal(a.rows.length,2);
 assert.equal(a.requests,0,'pending FX must not run during Shortcuts import');
 assert.equal(a.output.shouldAppendNumbers,true);
 assert.match(a.output.receipt,/待換算外幣：1 筆/);mark();
 a=await exec(null,store(),[JSON.stringify(entry)]);
 assert.equal(a.rows.length,1);assert.match(a.output.receipt,/接收來源：Texts/);mark();
 a=await exec(null,store());assert.match(a.output.receipt,/未入帳/);assert.equal(a.output.shouldAppendNumbers,false);assert.equal(a.audit.stage,'no_input');mark();
 a=await exec({...entry,amount:'HK$57.00'},store());assert.equal(a.rows[0].amount,57);mark();
 console.log('PASS: '+count+' Expense Tracker offline integration + Numbers bridge scenarios, zero network on import');
})().catch(e=>{console.error(e);process.exitCode=1;});
