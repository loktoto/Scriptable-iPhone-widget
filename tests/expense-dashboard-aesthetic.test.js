// Premium Dashboard / renamed canonical food Merchant Type / source-cited design QA.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const sourcePath=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',sourcePath]);
const source=fs.readFileSync(sourcePath,'utf8');
const cut=source.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert.ok(cut>1000);
const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const rows=[
 {id:'legacy-food-1',category:'食物',originalCategory:'食物',card:'Payme',amount:2,
  amountHKD:2,currency:'HKD',date,merchant:'未提供商戶',remark:'可搜尋備註',transactionTime:date+'T15:02:47'},
 {id:'legacy-food-2',category:'餐飲',originalCategory:'Restaurants',card:'SOGO VISA',
  amount:57,amountHKD:57,currency:'HKD',date,merchant:'Coffee & Food',remark:''},
 {id:'refund',category:'飲品',card:'現金',amount:-9.6,amountHKD:-9.6,currency:'HKD',
  date,merchant:'Refund Demo'},
 {id:'pending',category:'交通',card:'My Custom Wallet',paymentType:'My Custom Wallet',
  amount:20,amountHKD:null,currency:'USD',fxStatus:'pending',date,merchant:'Foreign Shop'}
];
const disk=new Map([['/local/ExpenseTrackerHK/transactions.json',JSON.stringify({version:1,transactions:rows})]]);
let writes=0;
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),createDirectory:()=>{},
 readString:p=>disk.get(p),writeString:(p,x)=>{writes++;disk.set(p,x)}};
const ctx={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},args:{},
 config:{runsInApp:true,runsInWidget:false},console};
vm.createContext(ctx);
const boot='(async()=>{\n'+source.slice(0,cut)+
 '\nreturn {MERCHANT_TYPES,MANUAL_CATEGORIES,canonicalCategory,categoryForDisplay,categoryOf,normalize,dashboardHTML,dashboardTrendSVG,widgetSummary,saveManualForm,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
(async()=>{
 const a=await vm.runInContext(boot,ctx);
 assert.equal([...a.MERCHANT_TYPES].join('/'),'食飯/飲品/娛樂/日用品/交通/旅行/衣服/水電/醫療/訂閱/進修/運動');
 assert.equal(a.MANUAL_CATEGORIES[0].label,'食飯');
 for(const v of ['食飯','食物','餐飲','飲食','Restaurants','food','吃飯','膳食'])
   assert.equal(a.canonicalCategory(v),'食飯',v+' should resolve to the requested name');
 assert.equal(a.categoryOf('食物','MTR'),'食飯','Explicit food should outrank merchant keyword');
 assert.equal(a.categoryForDisplay(rows[0]),'食飯');
 const normalized=a.normalize({MerchantType:'食物',Card:'Payme',Amount:2,Currency:'HKD',Date:date});
 assert.equal(normalized.category,'食飯');
 assert.equal(normalized.originalCategory,'食物','Original input must remain intact');
 assert.equal(normalized.paymentType,'Payme');
 assert.equal(normalized.amount,2);
 assert.equal(a.normalize({MerchantType:'食飯',Card:'Payme',Amount:0,Currency:'HKD'}),null);
 assert.equal(a.normalize({MerchantType:'食飯',Card:'Payme',Amount:-1,Currency:'HKD'}).amount,-1);
 assert.equal(a.widgetSummary().monthlyCats.some(([name])=>name==='食飯'),true,'Widget must also use canonical 食飯');
 const html=a.dashboardHTML();
 assert.ok(html.includes('id="overview"'));
 assert.ok(html.includes('class="hero"'));
 assert.ok(html.includes('class="hero-amount"'));
 assert.ok(html.includes('MY EXPENSES · HKD'));
 assert.ok(html.includes('id="categories"'));
 assert.ok(html.includes('id="payments"'));
 assert.ok(html.includes('id="transactions"'));
 assert.ok(html.includes('id="trends"'));
 assert.ok(html.includes('class="quick-nav"'));
 assert.ok(html.includes('class="rankings"'));
 assert.ok(html.includes('class="cat-icon"'));
 assert.ok(html.includes('class="cat-track"'));
 assert.ok(html.includes('class="pay-mark"'));
 assert.ok(html.includes('class="tx-avatar"'));
 assert.equal((html.match(/class="category-tile"/g)||[]).length,12,'Exactly twelve canonical categories');
 assert.ok(html.includes('data-pick-category="食飯"'));
 assert.ok(!html.includes('data-pick-category="食物"'));
 assert.ok(html.includes('class="cat-val"></span>'),'Inactive category should show an empty value');
 assert.ok(html.includes('data-payment="Payme"'));
 assert.ok(html.includes('Payme'));
 assert.ok(html.includes('可搜尋備註'));
 assert.ok(html.includes('id="txSearch"'));
 assert.ok(html.includes('id="txPaymentFilter"'));
 assert.ok(html.includes('https://expense-editor.invalid/edit?row=0'));
 assert.ok(html.includes('https://expense-editor.invalid/delete?row=0'));
 assert.ok(html.includes('aria-label="顯示刪除操作"'));
 assert.ok(html.includes('touch-action:pan-y'));
 assert.ok(html.includes('class="tx-remark"'));
 assert.ok(html.includes('aria-pressed="false"'));
 assert.ok(html.includes(':focus-visible'));
 assert.ok(html.includes('prefers-reduced-motion'));
 assert.ok(html.includes('env(safe-area-inset-top,0px)'));
 assert.ok(html.includes('@media(max-width:365px)'));
 assert.ok(!/<(?:script|link)[^>]+src="https?:\/\//i.test(html),'Dashboard must not load remote dependencies');
 const js=/<script>([\s\S]*?)<\/script>/.exec(html);
 assert.ok(js&&js[1],'Dashboard interaction script missing');
 new vm.Script(js[1]);
 assert.equal(writes,0,'Rendering dashboard must never mutate the database');
 assert.deepEqual(JSON.parse(disk.get('/local/ExpenseTrackerHK/transactions.json')).transactions,rows,
   'Viewing data must not rewrite legacy stored categories');
 const manual=a.saveManualForm({date,time:'10:10',merchant:'Lunch',amount:'2',
  currency:'HKD',category:'食飯',card:'Payme',paymentType:'Payme',remark:'test'},
 '1730800000005-abcdef');
 assert.equal(manual.status,'saved');
 assert.equal(JSON.parse(disk.get('/local/ExpenseTrackerHK/transactions.json')).transactions.at(-1).category,'食飯');
 console.log('PASS: premium mobile dashboard, requested 食飯 naming, 12 category glyphs, Payme, FX honesty, original records and safe input');
})().catch(e=>{console.error(e);process.exitCode=1;});
