// Full Scriptable-like widget view-tree tests; no network/iPhone runtime required.
// Four sizes MUST add genuinely different information; fixture amounts are synthetic.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const script=fs.readFileSync(path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js'),'utf8');
cp.execFileSync(process.execPath,['--check',path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js')]);
const cut=script.indexOf('// Backfill missing FX fields from previously saved v2 records.');
assert(cut>1000,'Scriptable entrypoint boundary missing');
const p2=n=>String(n).padStart(2,'0');
const d=new Date(),today=[d.getFullYear(),p2(d.getMonth()+1),p2(d.getDate())].join('-');
const ago=n=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-n);
 return [x.getFullYear(),p2(x.getMonth()+1),p2(x.getDate())].join('-');};
const rows=[
 {id:'demo-1',date:today,transactionTime:today+'T12:30:00',
  merchant:'Lunch Cafe',category:'食飯',card:'Payme',amount:57,amountHKD:57,currency:'HKD'},
 {id:'demo-2',date:today,transactionTime:today+'T08:30:00',
  merchant:'MTR Rail',category:'交通',card:'八達通',amount:16,amountHKD:16,currency:'HKD'},
 {id:'demo-3',date:today,transactionTime:today+'T10:30:00',
  merchant:'Breakfast',category:'食飯',card:'現金',amount:12,amountHKD:12,currency:'HKD'},
 {id:'demo-4',date:ago(1),transactionTime:ago(1)+'T12:30:00',
  merchant:'Coffee',category:'飲品',card:'SOGO VISA',amount:25,amountHKD:25,currency:'HKD'},
 {id:'demo-5',date:ago(2),merchant:'Mobile Plan',category:'訂閱',
  card:'HSBC',paymentType:'My Custom QR',amount:70,amountHKD:70,currency:'HKD'},
 {id:'demo-6',date:ago(3),merchant:'Clothes',category:'衣服',
  card:'Payme',amount:30,amountHKD:30,currency:'HKD'},
 {id:'demo-7',date:ago(4),merchant:'Refund',category:'食物',
  card:'Payme',amount:-10,amountHKD:-10,currency:'HKD'},
 {id:'demo-8',date:ago(5),merchant:'Books',category:'進修',
  card:'__proto__',paymentType:'__proto__',amount:18,amountHKD:18,currency:'HKD'},
 {id:'pending',date:ago(1),merchant:'USD Overseas',category:'旅行',
  card:'Payme',amount:20,amountHKD:null,currency:'USD',fxStatus:'pending'}
];
class MockStack{
 constructor(type='stack'){this.type=type;this.children=[];this.spacing=0;}
 addText(text){const t={type:'text',text:String(text)};this.children.push(t);return t}
 addStack(){const x=new MockStack();this.children.push(x);return x}
 addImage(image){const x={type:'image',content:image,applyFittingContentMode(){},
 centerAlignImage(){}};this.children.push(x);return x}
 addSpacer(v){const x={type:'spacer',value:v};this.children.push(x);return x}
 setPadding(...p){this.padding=p}
 layoutHorizontally(){this.direction='horizontal'}
 layoutVertically(){this.direction='vertical'}
 centerAlignContent(){}
}
class MockWidget extends MockStack{
 constructor(){super('widget')}
 async presentSmall(){this.present='small'}
 async presentMedium(){this.present='medium'}
 async presentLarge(){this.present='large'}
 async presentExtraLarge(){this.present='extraLarge'}
}
class DrawContext{
 constructor(){this.draws=[]}
 setFillColor(){}
 fillRect(rect){this.draws.push({type:'rect',rect})}
 setFont(){}
 setTextColor(){}
 setTextAlignedCenter(){}
 drawTextInRect(text,rect){this.draws.push({type:'label',text,rect})}
 getImage(){return {type:'drawn-image',size:this.size,draws:this.draws}}
}
class Size{constructor(width,height){this.width=width;this.height=height}}
class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
class Color{constructor(x){this.value=x}}
const Font={semiboldSystemFont:size=>({size,bold:true}),systemFont:size=>({size}),
 mediumSystemFont:size=>({size,medium:true})};
const dbPath='/local/ExpenseTrackerHK/transactions.json';
function createTestSuite(entries=rows,pad=false){
 const disk=new Map([[dbPath,JSON.stringify({version:1,transactions:entries})]]);
 const fm={documentsDirectory:()=>'/local',joinPath:(a,b)=>a+'/'+b,
  fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
  createDirectory:()=>{},readString:p=>disk.get(p),writeString:(p,s)=>disk.set(p,s)};
 const args={widgetParameter:''};
 const ctx={FileManager:{local:()=>fm},Script:{name:()=> 'Expense'},
  config:{runsInApp:true,runsInWidget:false,widgetFamily:'small'},args,Color,Font,
  Size,Rect,DrawContext,ListWidget:MockWidget,URLScheme:{forRunningScript:()=>'scriptable:///run?scriptName=Expense'},
  Device:{screenSize:()=>({width:pad?1024:393}),isPad:()=>pad},console};
 vm.createContext(ctx);
 const boot='(async()=>{\n'+script.slice(0,cut)+
  '\nreturn {buildWidget,widgetSummary,chartPoints,makeBarChart,previewWidget,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
 return {ctx,args,disk,boot};
}
function flatten(node){
 const out=[];(function visit(x){
  if(x.type==='text')out.push(x.text);
  if(x.children)for(const ch of x.children)visit(ch);
 })(node);return out;
}
function graphs(node){
 const items=[];(function visit(x){
  if(x.type==='image'&&x.content.type==='drawn-image'&&x.content.size.height>10)items.push(x.content);
  if(x.children)for(const ch of x.children)visit(ch);
 })(node);return items;
}
(async()=>{
 const fixture=createTestSuite();
 const app=await vm.runInContext(fixture.boot,fixture.ctx);
 const summary=app.widgetSummary();
 assert.equal(summary.month,218,'Known synthetic monthly HKD net');
 assert.equal(summary.txCount,8,'Pending FX excluded from HKD count');
 assert.equal(summary.unresolved,1,'Pending FX remains visible');
 assert.equal(summary.monthlyCats[0][0],'食飯','Legacy 食物 merged with new 食飯');
 assert.ok(summary.monthlyPayments.some(([k])=>k==='Payme'));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='My Custom QR'));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='__proto__'),'Prototype-like custom method must not corrupt groups');
 assert.equal(summary.recent.length,6);
 assert.equal(summary.sixMonths.length,6);
 const small=app.buildWidget('small'),medium=app.buildWidget('medium'),large=app.buildWidget('large');
 const st=flatten(small).join('|'),mt=flatten(medium).join('|'),lt=flatten(large).join('|');
 assert.ok(st.includes('本月淨支出'));
 assert.ok(st.includes('今日'));
 assert.ok(st.includes('8 筆本月交易'));
 assert.equal(graphs(small).length,0,'Small must be glanceable WITHOUT a repeated chart');
 assert.ok(!st.includes('14日')&&!st.includes('分類 Top 3'),'Small should not mimic Medium/Large');
 assert.equal(graphs(medium).length,1);
 assert.ok(mt.includes('最近14日'));
 assert.ok(mt.includes('近7日'));
 assert.ok(mt.includes('最多：食飯'));
 assert.ok(!mt.includes('最近交易'),'Medium must NOT mimic Large');
 assert.ok(lt.includes('本月分類 Top 3'));
 assert.ok(lt.includes('付款方式 Top 2'));
 assert.ok(lt.includes('最近交易'));
 assert.ok(lt.includes('Payme'));
 assert.ok(lt.includes('Lunch Cafe'));
 assert.equal(graphs(large).length,1,'Large should use one chart plus ranked categories and transactions');
 assert.equal(small.url,'scriptable:///run?scriptName=Expense&view=dashboard');
 assert.equal(small.refreshAfterDate instanceof Date,true);
 fixture.args.widgetParameter='quick';
 assert.equal(app.buildWidget('small').url,'scriptable:///run?scriptName=Expense&view=manual');
 const ipad=createTestSuite(rows,true);
 const ipadApp=await vm.runInContext(ipad.boot,ipad.ctx);
 const xl=ipadApp.buildWidget('extraLarge');
 const xt=flatten(xl).join('|');
 assert.ok(xt.includes('記帳控制台 · iPad'));
 assert.ok(xt.includes('最近 30 日'));
 assert.ok(xt.includes('最近 6 個月'));
 assert.ok(xt.includes('本月分類 Top 5'));
 assert.ok(xt.includes('付款方式 Top 3'));
 assert.ok(xt.includes('最近 6 筆交易'));
 assert.ok(xt.includes('本月退款'));
 assert.equal(graphs(xl).length,2,'iPad XL must have both 30-day AND six-month charts');
 assert.ok(xt.includes('Payme'));
 assert.ok(xt.includes('1 筆日期／匯率待核對'));
 const widths=graphs(xl).map(x=>x.size.width);
 assert.ok(widths.every(x=>x>150&&x<=665),'iPad charts must use bounded widths');
 const empty=createTestSuite([],true),emptyApp=await vm.runInContext(empty.boot,empty.ctx);
 for(const size of ['small','medium','large','extraLarge']){
   const w=emptyApp.buildWidget(size),out=flatten(w).join('|');
   assert.ok(out.includes('HK$0.00'),'No-data view must display honest 0 monthly value');
   assert.ok(!out.includes('NaN')&&!out.includes('undefined'));
 }
 const stable=JSON.parse(fixture.disk.get(dbPath));
 assert.equal(stable.transactions[6].category,'食物','Viewing widgets must NOT migrate source rows');
 assert.equal(stable.transactions[8].fxStatus,'pending','Widgets must not call FX or mutate pending records');
 console.log('PASS: Small/Medium/Large/iPad XL distinct information, paired charts, prototype-safe payment groups, refunds, pending FX, empty states and quick link');
})().catch(e=>{console.error(e);process.exitCode=1});
