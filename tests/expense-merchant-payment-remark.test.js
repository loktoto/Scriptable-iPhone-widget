// Offline integration regression for Merchant Type, Payment Type and Remark.
// Test app data, manual form, edit persistence and dashboard HTML on same local JSON.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const sourcePath=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',sourcePath]);
const script=fs.readFileSync(sourcePath,'utf8');
const cut=script.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000,'script initialization boundary absent');
const dbPath='/local/ExpenseTrackerHK/transactions.json';
const original={id:'test-legacy',amount:22,date:'2026-11-05',currency:'HKD',
  amountHKD:22,merchant:'Old Restaurant',category:'餐飲',card:'SOGO VISA SIGNATURE CARD',
  transactionTime:'2026-11-05T10:30:00',source:'Shortcut'};
const disk=new Map([[dbPath,JSON.stringify({version:1,transactions:[original]})]]);
const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
 fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),createDirectory:()=>{},
 readString:p=>disk.get(p),writeString:(p,s)=>disk.set(p,s)};
const context={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},config:{runsInApp:true,runsInWidget:false},args:{},console};
vm.createContext(context);
const boot='(async()=>{\n'+script.slice(0,cut)+
 '\nreturn {MERCHANT_TYPES,PAYMENT_TYPES,normalize,categoryOf,categoryForDisplay,paymentTypeOf,manualFormHTML,saveManualForm,dashboardHTML,applyDashboardEdit,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
(async()=>{
 const app=await vm.runInContext(boot,context);
 assert.equal([...app.MERCHANT_TYPES].join('/'),'食物/飲品/娛樂/日用品/交通/旅行/衣服/水電/醫療/訂閱/進修/運動');
 assert.equal([...app.PAYMENT_TYPES].join('/'),'信用卡/扣賬卡/現金/八達通/轉數快/銀行轉帳/電子錢包/其他');
 assert.equal(app.categoryOf('Restaurants','KPay*FOOD'),'食物');
 assert.equal(app.categoryOf('飲品','MTR'),'飲品','explicit label overrides merchant rules');
 assert.equal(app.categoryOf('餐飲','Old Restaurant'),'食物');
 assert.equal(app.categoryForDisplay(original),'食物','legacy category is presented without rewriting');
 assert.equal(app.paymentTypeOf(original),'信用卡');
 assert.equal(app.categoryOf('健康醫療','Unknown Clinic'),'醫療');
 assert.equal(app.categoryOf('超市雜貨','Store'),'日用品');
 const valid=app.normalize({merchantName:'Cafe',amount:57,merchantType:'飲品',
   currency:'HKD',card:'SOGO VISA',paymentType:'信用卡',remark:'午餐後飲品 + 同事'});
 assert.equal(valid.amount,57);assert.equal(valid.category,'飲品');
 assert.equal(valid.paymentType,'信用卡');assert.equal(valid.remark,'午餐後飲品 + 同事');
 const noExtras=app.normalize({merchantName:'Sample',amount:12,currency:'HKD',merchantType:'食物'});
 assert.equal(noExtras.remark,'');assert.equal(noExtras.paymentType,'');
 assert.equal(app.normalize({amount:'0',currency:'HKD'}),null);
 assert.equal(app.normalize({amount:'-10',currency:'HKD'}).amount,-10);
 const form=app.manualFormHTML('1730800000000-abc1234');
 for(const id of ['manualRemark','manualPaymentType','manualCard','manualCategory'])assert.ok(form.includes('id="'+id+'"'));
 assert.ok(form.includes('data-category="飲品"'));
 assert.ok(form.includes('data-category="食物"'));
 assert.ok(!form.includes('data-category="投資"'));
 const save=app.saveManualForm({date:'2026-11-05',time:'10:50',merchant:'Coffee Shop',
  currency:'HKD',amount:'9.60',category:'飲品',card:'',paymentType:'現金',remark:'早上咖啡'},
  '1730800000002-abcde');
 assert.equal(save.status,'saved');
 let db=JSON.parse(disk.get(dbPath));
 assert.equal(db.transactions.length,2);
 assert.equal(db.transactions[0].category,'餐飲','No migration or rewrite of legacy records');
 assert.equal(db.transactions[1].remark,'早上咖啡');
 assert.equal(db.transactions[1].paymentType,'現金');
 assert.equal(db.transactions[1].category,'飲品');
 const html=app.dashboardHTML();
 for(const c of app.MERCHANT_TYPES)assert.ok(html.includes('data-pick-category="'+c+'"'));
 assert.ok(html.includes('id="txCategoryFilter"'));
 assert.ok(html.includes('id="txPaymentFilter"'));
 assert.ok(html.includes('id="txCardFilter"'));
 assert.ok(html.includes('早上咖啡'),'Remark displayed');
 assert.ok(html.includes('data-filter="') && html.includes('早上咖啡'));
 assert.ok(html.includes('data-payment="現金"'));
 assert.ok(html.includes('data-payment="信用卡"'));
 assert.ok(html.includes('data-category="食物"'));
 assert.ok(html.includes('function applyFilters()'));
 assert.ok(!html.includes('data-filter="KPay'));
 const transaction=db.transactions[1], snapshot=JSON.parse(JSON.stringify(transaction));
 assert.equal(app.applyDashboardEdit(1,snapshot,{
   dateTime:transaction.transactionTime,merchant:transaction.merchant,
   category:'飲品',currency:'HKD',amount:'9.60',
   card:'SAMPLE VISA',paymentType:'信用卡',remark:'替朋友買咖啡'
 }),true);
 db=JSON.parse(disk.get(dbPath));
 assert.equal(db.transactions[1].id,transaction.id);
 assert.equal(db.transactions[1].paymentType,'信用卡');
 assert.equal(db.transactions[1].card,'SAMPLE VISA');
 assert.equal(db.transactions[1].remark,'替朋友買咖啡');
 assert.equal(db.transactions[1].amountHKD,9.6,'Metadata edits must preserve FX valuation');
 const latest=JSON.parse(JSON.stringify(db.transactions[1]));
 assert.throws(()=>app.applyDashboardEdit(1,latest,{dateTime:latest.date,
  merchant:'Coffee',category:'Not-A-Category',currency:'HKD',amount:'10',card:'',paymentType:'現金',remark:''}),/Merchant Type/);
 assert.throws(()=>app.applyDashboardEdit(1,latest,{dateTime:latest.date,
  merchant:'Coffee',category:'飲品',currency:'HKD',amount:'0',card:'',paymentType:'現金',remark:''}),/金額/);
 assert.equal(JSON.parse(disk.get(dbPath)).transactions[1].remark,'替朋友買咖啡');
 console.log('PASS: 12 categories, legacy aliases, payment/card split, remarks, dashboard filters, non-destructive editing and amount rules');
})().catch(e=>{console.error(e);process.exitCode=1});
