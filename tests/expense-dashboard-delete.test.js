// Offline regression tests for swipe-to-delete, safe disk deletion and confirmation.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const source=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',source]);
const raw=fs.readFileSync(source,'utf8');
const cut=raw.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000,'Scriptable entry point boundary missing');
const dbPath='/local/ExpenseTrackerHK/transactions.json';
const t1={id:'tx-a',merchant:'Example Cafe',amount:57,currency:'HKD',category:'餐飲',
 date:'2026-11-04',transactionTime:'2026-11-04T20:33:28',amountHKD:57,
 fxStatus:'native',createdAt:'2026-11-04T20:33:30Z',card:'TEST CARD'};
const t2={id:'tx-b',merchant:'Example Transit',amount:12.5,currency:'HKD',category:'交通',
 date:'2026-11-05',transactionTime:'2026-11-05T09:00:00',amountHKD:12.5,
 fxStatus:'native',createdAt:'2026-11-05T09:00:00Z',card:''};
const disk=new Map([[dbPath,JSON.stringify({version:1,transactions:[t1,t2]})]]);
let writes=0;
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
 createDirectory:()=>{},readString:p=>disk.get(p),
 writeString:(p,s)=>{writes++;disk.set(p,s)}};
const context={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},
 config:{runsInWidget:false,runsInApp:true},args:{},console};
vm.createContext(context);
const boot='(async()=>{\n'+raw.slice(0,cut)+
 '\nreturn {deleteDashboardTransaction,showDashboardDelete,dashboardHTML};\n}\nreturn await runExpenseTrackerHK();\n})()';
function read(){return JSON.parse(disk.get(dbPath)).transactions;}
(async()=>{
 const state=await vm.runInContext(boot,context);
 const snapshot=()=>JSON.parse(JSON.stringify(t1));
 const html=state.dashboardHTML();
 assert.ok(html.includes('https://expense-editor.invalid/delete?row=0'));
 assert.ok(html.includes('https://expense-editor.invalid/edit?row=0'));
 assert.ok(html.includes('class="tx-swipe-shell"'));
 assert.ok(html.includes('aria-label="顯示刪除操作"'));
 assert.ok(html.includes('touch-action:pan-y'));
 assert.ok(html.includes('addEventListener("touchmove"'));
 assert.ok(!html.includes('KPay*CHUN LAM'));

 // Verify JS swipe gesture can reveal and conceal without deleting the row.
 const embedded=/<script>([\s\S]*?)<\/script>/.exec(html);
 assert.ok(embedded&&embedded[1]);
 const handlers={},buttonHandlers={},buttonState={};
 const classes=new Set();
 const button={addEventListener:(name,fn)=>buttonHandlers[name]=fn,
   setAttribute:(key,value)=>buttonState[key]=value};
 const front={style:{}};
 const card={hidden:false,
   querySelector:key=>key==='.tx-more'?button:key==='.tx-swipe-front'?front:null,
   addEventListener:(name,fn)=>handlers[name]=fn,
   classList:{
     add:name=>classes.add(name),remove:name=>classes.delete(name),
     contains:name=>classes.has(name),
     toggle:(name,yes)=>yes?classes.add(name):classes.delete(name)
   },
   getAttribute:key=>key==='data-filter'?'example cafe hk':null,
   contains:()=>false
 };
 const searchHandlers={};
 const search={value:'',addEventListener:(name,fn)=>searchHandlers[name]=fn};
 const document={
   getElementById:key=>key==='txSearch'?search:null,
   querySelectorAll:key=>key==='.tx-swipe-shell'?[card]:[],
   addEventListener:()=>{}
 };
 vm.runInNewContext(embedded[1],{document});
 let prevented=false;
 function swipe(from,to,dy=1){
   const target={closest:()=>null};
   handlers.touchstart({touches:[{clientX:from,clientY:40}],target});
   handlers.touchmove({touches:[{clientX:to,clientY:40+dy}],
     preventDefault:()=>{prevented=true}});
   handlers.touchend({changedTouches:[{clientX:to,clientY:40+dy}]});
 }
 swipe(250,180);
 assert.equal(classes.has('is-open'),true,'Swipe left should reveal Delete button');
 assert.equal(buttonState['aria-expanded'],'true');
 assert.equal(prevented,true);
 assert.equal(read().length,2,'Gesture alone must not delete data');
 swipe(100,175);
 assert.equal(classes.has('is-open'),false,'Swipe right should close');
 buttonHandlers.click({stopPropagation(){}});
 assert.equal(classes.has('is-open'),true,'More button reveals Delete');
 search.value='no match';searchHandlers.input();
 assert.equal(card.hidden,true);
 assert.equal(classes.has('is-open'),false,'Searching must close actions for hidden rows');

 // Cancellation: native confirmation is mandatory before removal.
 let confirmation=-1,destructiveActions=0,updatedHTML='';
 context.Alert=class {
   constructor(){this.title='';this.message='';}
   addDestructiveAction(){destructiveActions++;}
   addCancelAction(){}
   addAction(){}
   async presentAlert(){return confirmation;}
 };
 const web={loadHTML:async html=>{updatedHTML=html;}};
 assert.equal(await state.showDashboardDelete(0,web),false);
 assert.equal(destructiveActions,1);assert.equal(read().length,2);
 assert.equal(writes,0,'Cancel must not write anything');

 // Preserve newer append, verify previous-file backup and dashboard rebuild.
 disk.set(dbPath,JSON.stringify({version:1,transactions:[t1,t2,
   {id:'tx-c',merchant:'Concurrent Purchase',amount:8,currency:'HKD',
    date:'2026-11-05',amountHKD:8}]}));
 confirmation=0;
 assert.equal(await state.showDashboardDelete(0,web),true);
 assert.deepEqual(read().map(t=>t.id),['tx-b','tx-c']);
 const backup=JSON.parse(disk.get('/local/ExpenseTrackerHK/transactions.previous.json'));
 assert.deepEqual(backup.transactions.map(t=>t.id),['tx-a','tx-b','tx-c']);
 assert.ok(updatedHTML.includes('已刪除交易'));
 assert.ok(!updatedHTML.includes('Example Cafe'));
 assert.ok(updatedHTML.includes('Example Transit'));
 assert.ok(updatedHTML.includes('Concurrent Purchase'));

 // Missing row and duplicates must not silently remove another transaction.
 assert.throws(()=>state.deleteDashboardTransaction(0,snapshot()),/索引|過時|重新/);
 const b=JSON.parse(JSON.stringify(read()[0]));
 disk.set(dbPath,JSON.stringify({version:1,transactions:[b,{...b}]}));
 assert.throws(()=>state.deleteDashboardTransaction(0,b),/重複/);
 disk.set(dbPath,JSON.stringify({version:1,transactions:[{...b,amount:20}]}));
 assert.throws(()=>state.deleteDashboardTransaction(0,b),/其他操作修改/);
 assert.equal(read().length,1);

 console.log('PASS: left/right swipe, more button, search, cancellation, verified deletion, backup, concurrency and ID conflicts');
})().catch(e=>{console.error(e);process.exitCode=1;});
