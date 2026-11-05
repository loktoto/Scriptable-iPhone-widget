// Dynamic payment names, legacy Food label and compact responsive dashboard UI.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const file=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',file]);
const source=fs.readFileSync(file,'utf8');
const cut=source.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000);
const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const legacy={id:'sample-payme',amount:2,currency:'HKD',amountHKD:2,
 date,transactionTime:date+'T15:02:47',category:'食飯',originalCategory:'食飯',
 card:'Payme',merchant:'未提供商戶',remark:'午餐後補返錢'};
const custom={id:'sample-custom',amount:42,currency:'HKD',amountHKD:42,
 date,category:'交通',merchant:'Bus Card',card:'Custom Card',
 paymentType:'My Custom Wallet',remark:'<img src=x onerror=alert(1)>'};
const disk=new Map([['/local/ExpenseTrackerHK/transactions.json',
 JSON.stringify({version:1,transactions:[legacy,custom]})]]);
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
 createDirectory:()=>{},readString:p=>disk.get(p),writeString:(p,s)=>disk.set(p,s)};
const ctx={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},
 config:{runsInApp:true,runsInWidget:false},args:{},console};
vm.createContext(ctx);
const boot='(async()=>{\n'+source.slice(0,cut)+
 '\nreturn {normalize,categoryOf,categoryForDisplay,paymentTypeOf,normalizePaymentType,dashboardHTML,dashboardTrendSVG,manualFormHTML,saveManualForm,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
(async()=>{
 const app=await vm.runInContext(boot,ctx);
 assert.equal(app.categoryForDisplay(legacy),'食物');
 assert.equal(app.categoryOf('食飯','MTR'),'食物','explicit Food must override merchant keyword');
 assert.equal(app.paymentTypeOf(legacy),'Payme');
 assert.equal(app.paymentTypeOf(custom),'My Custom Wallet');
 assert.equal(app.normalizePaymentType('AlipayHK'),'AlipayHK');
 assert.equal(app.normalizePaymentType('Mysterious Bank QR'),'Mysterious Bank QR');
 assert.equal(app.normalizePaymentType('My VISA Wallet'),'My VISA Wallet','Explicit custom label must not be collapsed');
 assert.equal(app.paymentTypeOf({card:'SOGO VISA SIGNATURE CARD'}),'信用卡','Only Card fallback may infer a broad payment category');
 const received=app.normalize({Date:date,MerchantType:'食飯',Card:'Payme',
  Amount:2,Currency:'HKD'});
 assert.equal(received.category,'食物');assert.equal(received.originalCategory,'食飯');
 assert.equal(received.paymentType,'Payme');
 assert.equal(received.amountHKD,2);assert.equal(received.remark,'');
 const html=app.dashboardHTML();
 assert.ok(html.includes('padding:max(110px'),'Safe upper padding required');
 assert.ok(html.includes('env(safe-area-inset-top'),'iPhone safe inset required');
 assert.ok(html.includes('data-pick-payment="Payme"'),'Payme must show as its own payment label');
 assert.ok(html.includes('data-pick-payment="My Custom Wallet"'),'Custom payment must appear dynamically');
 assert.ok(html.includes('data-payment="Payme"'),'Payme must be usable in transaction filter');
 assert.ok(html.includes('data-payment="My Custom Wallet"'));
 assert.ok(html.includes('<option value="Payme">Payme</option>'));
 assert.ok(html.includes('data-pick-category="食物"'));
 assert.ok(html.includes('data-filter=')&&html.includes('食飯')&&html.includes('午餐後補返錢'));
 assert.ok(html.includes('id="txSearch"'));
 assert.ok(html.includes('id="txCategoryFilter"'));
 assert.ok(html.includes('id="txPaymentFilter"'));
 assert.ok(html.includes('id="txCardFilter"'));
 assert.ok(html.includes('id="txReset"'));
 assert.ok(html.includes('function applyFilters()'));
 assert.ok(html.includes('id="txList"'));
 assert.ok(html.includes('https://expense-editor.invalid/edit?row=0'));
 assert.ok(html.includes('https://expense-editor.invalid/delete?row=0'));
 assert.ok(html.indexOf('id="txList"')<html.indexOf('id="trendDays"'));
 assert.ok(html.includes('data-trend="months"'));
 assert.ok(html.includes('id="trendMonths" hidden'));
 assert.ok(html.includes('aria-label="顯示刪除操作"'));
 assert.ok(html.includes('touch-action:pan-y'));
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'),'Raw HTML tag must not be rendered');
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 const scripts=/<script>([\s\S]*?)<\/script>/.exec(html);
 assert.ok(scripts,'Interactive dashboard script must exist');
 new vm.Script(scripts[1]);
 assert.ok(app.dashboardTrendSVG(Array.from({length:14},(_,i)=>({label:String(i),value:0}))).includes('暫時冇'));
 const negative=app.dashboardTrendSVG([{label:'回贈',value:-5},{label:'支出',value:10}]);
 assert.ok(negative.includes('#45d2a0'),'Refunds should render below baseline in green');
 const form=app.manualFormHTML('1730800000000-example');
 assert.ok(form.includes('id="manualPaymentType"'));
 assert.ok(form.includes('list="paymentSuggestions"'),'Manual payment type suggestions must be open-ended');
 assert.ok(form.includes('My Custom Wallet'),'Previously used methods should be suggested');
 const saved=app.saveManualForm({date,time:'11:20',merchant:'Sample Store',
  currency:'HKD',amount:'12',category:'日用品',card:'',
  paymentType:'New QR Provider',remark:'自訂付款測試'},'1730800000005-abcdef');
 assert.equal(saved.status,'saved');
 const after=JSON.parse(disk.get('/local/ExpenseTrackerHK/transactions.json'));
 assert.equal(after.transactions.length,3);
 assert.equal(after.transactions[2].paymentType,'New QR Provider');
 assert.equal(after.transactions[0].category,'食飯','No legacy mutation allowed');
 assert.equal(after.transactions[0].card,'Payme','Original Card retained');
 console.log('PASS: compact safe dashboard, chart switching, dynamic Payme/custom payments, Food aliases, remarks, swipe/edit controls and local persistence');
})().catch(e=>{console.error(e);process.exitCode=1;});
