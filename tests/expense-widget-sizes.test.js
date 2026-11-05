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
// Keep all synthetic month-fixture purchases within the current calendar month.
const inMonthAgo=n=>ago(Math.min(n,d.getDate()-1));
const rows=[
 {id:'demo-1',date:today,transactionTime:today+'T12:30:00',
  merchant:'Lunch Cafe',category:'食飯',card:'Payme',amount:57,amountHKD:57,currency:'HKD'},
 {id:'demo-2',date:today,transactionTime:today+'T08:30:00',
  merchant:'MTR Rail',category:'交通',card:'八達通',amount:16,amountHKD:16,currency:'HKD'},
 {id:'demo-3',date:today,transactionTime:today+'T10:30:00',
  merchant:'Breakfast',category:'食飯',card:'現金',amount:12,amountHKD:12,currency:'HKD'},
 {id:'demo-4',date:inMonthAgo(1),transactionTime:ago(1)+'T12:30:00',
  merchant:'Coffee',category:'飲品',card:'SOGO VISA',amount:25,amountHKD:25,currency:'HKD'},
 {id:'demo-5',date:inMonthAgo(2),merchant:'Mobile Plan',category:'訂閱',
  card:'HSBC',paymentType:'My Custom QR',amount:70,amountHKD:70,currency:'HKD'},
 {id:'demo-6',date:inMonthAgo(3),merchant:'Clothes',category:'衣服',
  card:'Payme',amount:30,amountHKD:30,currency:'HKD'},
 {id:'demo-7',date:inMonthAgo(4),merchant:'Refund',category:'食物',
  card:'Payme',amount:-10,amountHKD:-10,currency:'HKD'},
 {id:'demo-8',date:inMonthAgo(5),merchant:'Books',category:'進修',
  card:'__proto__',paymentType:'__proto__',amount:18,amountHKD:18,currency:'HKD'},
 {id:'pending',date:inMonthAgo(1),merchant:'USD Overseas',category:'旅行',
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
  '\nreturn {buildWidget,widgetSummary,chartPoints,makeBarChart,previewWidget,db,recentTitle,paymentRemainder};\n}\nreturn await runExpenseTrackerHK();\n})()';
 return {ctx,args,disk,boot};
}
function flatten(node){
 const out=[];(function visit(x){
  if(x.type==='text')out.push(x.text);
  if(x.children)for(const ch of x.children)visit(ch);
 })(node);return out;
}
function textNodes(node){
 const out=[];(function visit(x){
  if(x.type==='text')out.push(x);
  if(x.children)for(const child of x.children)visit(child);
 })(node);return out;
}
// Conservative approximate layout estimator (not a substitute for iPhone preview).
function estimatedHeight(node){
 if(node.type==='text')return Math.ceil((node.font?.size||11)*1.2);
 if(node.type==='image')return Math.ceil(node.imageSize?.height||node.content?.size?.height||0);
 if(node.type==='spacer')return Number.isFinite(node.value)?node.value:0;
 const sizes=(node.children||[]).map(estimatedHeight);
 const inner=node.direction==='horizontal'?Math.max(0,...sizes):sizes.reduce((a,b)=>a+b,0);
 const pad=node.padding||[];
 return inner+(pad[0]||0)+(pad[2]||0)+Math.max(0,sizes.length-1)*(node.spacing||0);
}
function graphs(node){
 const items=[];(function visit(x){
  if(x.type==='image'&&x.content.type==='drawn-image'&&x.content.size.height>10)items.push(x.content);
  if(x.children)for(const ch of x.children)visit(ch);
 })(node);return items;
}
(async()=>{
 const fixture=createTestSuite(),app=await vm.runInContext(fixture.boot,fixture.ctx);
 const summary=app.widgetSummary();
 assert.equal(summary.month,218);
 assert.equal(summary.txCount,8);
 assert.equal(summary.unresolved,1);
 assert.equal(summary.todayCount,3);
 assert.ok(summary.monthlyCats.some(([k,v])=>k==='食飯'&&v===59));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='Payme'));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='__proto__'));
 assert.equal(summary.recent.length,6);
 assert.equal(summary.sixMonths.length,6);
 const small=app.buildWidget('small'),medium=app.buildWidget('medium'),
   large=app.buildWidget('large');
 const st=flatten(small).join('|'),mt=flatten(medium).join('|'),lt=flatten(large).join('|');
 assert.ok(st.includes('月 · 支出'));
 assert.ok(st.includes('主要'),'Small must show meaningful leading category rather than repeated totals');
 assert.ok(st.includes('近7日'));
 assert.ok(st.includes('8筆'));
 assert.equal(graphs(small).length,1,'Seven-day mini heat strip is a real DrawContext image');
 assert.equal(graphs(small)[0].size.height,12);
 assert.equal(app.chartPoints(summary.byDay,7).length,7);
 assert.equal(flatten(small).filter(x=>['日','一','二','三','四','五','六'].includes(x)).length,7);
 assert.ok(textNodes(small).every(n=>n.font?.size>=11));
 assert.ok(!st.includes('14日'),'Small must not duplicate Medium');
 assert.ok(mt.includes('近14日'),'Medium normal multi-day scenario shows 14-day context');
 assert.equal(graphs(medium).length,1,'Medium normal multi-day case should draw time trend');
 assert.ok(lt.includes('14日趨勢'));
 assert.ok(lt.includes('分類支出'));
 assert.ok(lt.includes('付款方式'));
 assert.ok(lt.includes('最近交易'));
 assert.ok(lt.includes('Lunch Cafe'),'Large renders full-width recent merchant names');
 assert.ok(lt.includes('訂閱')&&lt.includes('食飯'));
 assert.equal(graphs(large).length,1,'Large contains one compact trend, not a large chart panel');
 for(const family of [small,medium,large]){
   const texts=textNodes(family);
   assert.ok(texts.every(x=>x.font.size>=11),'Native text must meet minimum 11pt');
 }
 console.log('New family heights (393pt device):',estimatedHeight(small),estimatedHeight(medium),estimatedHeight(large));
 assert.ok(estimatedHeight(small)<=158,'393pt Small must fit 158pt');
 assert.ok(estimatedHeight(medium)<=158,'393pt Medium must fit 158pt');
 assert.ok(estimatedHeight(large)<=354,'393pt Large must fit 354pt');
 assert.equal(small.url,'scriptable:///run?scriptName=Expense&view=dashboard');
 assert.ok(Number.isFinite(new Date(small.refreshAfterDate).getTime()));
 for(const accessory of ['accessoryInline','accessoryCircular','accessoryRectangular']){
   const a=app.buildWidget(accessory);
   assert.ok(flatten(a).join('|').includes('本月')||flatten(a).join('|').includes('$'));
   assert.equal(graphs(a).length,0);
 }
 fixture.args.widgetParameter='quick';
 assert.equal(app.buildWidget('small').url,'scriptable:///run?scriptName=Expense&view=manual');
 const ipad=createTestSuite(rows,true),ipadApp=await vm.runInContext(ipad.boot,ipad.ctx);
 const xl=ipadApp.buildWidget('extraLarge'),xt=flatten(xl).join('|');
 assert.ok(xt.includes('財務總覽'));
 assert.ok(xt.includes('最近30日'));
 assert.ok(xt.includes('最近6個月'));
 assert.ok(xt.includes('本月分類 Top 5'));
 assert.ok(xt.includes('付款方式 Top 4'));
 assert.ok(xt.includes('最近六筆交易'));
 assert.ok(xt.includes('Lunch Cafe'));
 assert.equal(graphs(xl).length,2,'Extra Large is a distinct multi-period analytic dashboard');
 assert.ok(graphs(xl).every(x=>x.size.width>100));
 const noData=createTestSuite([],true),empty=await vm.runInContext(noData.boot,noData.ctx);
 for(const family of ['small','medium','large','extraLarge']){
   const view=empty.buildWidget(family),t=flatten(view).join('|');
   assert.ok(t.includes('HK$0.00'));
   assert.ok(!t.includes('undefined')&&!t.includes('NaN'));
 }
 const cancelRows=[{...rows[0],id:'positive',amount:5,amountHKD:5},
  {...rows[0],id:'refund',amount:-5,amountHKD:-5}];
 const cancel=createTestSuite(cancelRows),ca=await vm.runInContext(cancel.boot,cancel.ctx);
 assert.equal(ca.widgetSummary().month,0);
 assert.ok(ca.widgetSummary().monthlyCats.some(([k,v])=>k==='食飯'&&v===0));
 assert.ok(ca.widgetSummary().monthlyPayments.some(([k,v])=>k==='Payme'&&v===0));
 // Exact screenshot: four transactions, HK$200.30. One active day.
 const four=[50,50,50,50.30].map((amount,i)=>({
  id:'four-'+i,date:today,transactionTime:today+'T12:0'+i+':00',
  merchant:'未提供商戶',category:i===0?'訂閱':'食飯',
  card:'Payme',amount,amountHKD:amount,currency:'HKD'
 }));
 const oneDay=createTestSuite(four),one=await vm.runInContext(oneDay.boot,oneDay.ctx);
 const sm=one.buildWidget('small'),md=one.buildWidget('medium'),lg=one.buildWidget('large');
 const smallText=flatten(sm).join('|'),mediumText=flatten(md).join('|');
 assert.equal((smallText.match(/HK\$200\.30/g)||[]).length,1,
   'Small must show monthly HK$200.30 only once');
 assert.equal((mediumText.match(/HK\$200\.30/g)||[]).length,1,
   'Medium must not reprint today / month / week equal totals');
 assert.equal(one.widgetSummary().sevenActive,1);
 assert.equal(one.widgetSummary().fourteenActive,1);
 assert.equal(graphs(md).length,0,
   'Single-day dataset should replace information-poor 14-day chart with useful categories');
 assert.ok(mediumText.includes('分類排行'));
 assert.ok(mediumText.includes('食飯'));
 assert.ok(estimatedHeight(sm)<=141,'Small must fit minimum 141pt iPhone');
 assert.ok(estimatedHeight(md)<=141,'Medium sparse mode must fit minimum 141pt iPhone');
 assert.ok(estimatedHeight(lg)<=354,'Large sparse mode must fit 354pt');
 assert.ok(flatten(lg).join('|').includes('食飯 · Payme'),
   'Missing merchant must use category/payment on Widget only');
 // Equal monthly and daily net can arise from earlier cancellations: never infer dates.
 const cross=[{...four[0],amount:200.30,amountHKD:200.30},
  {...four[1],date:inMonthAgo(1),amount:8,amountHKD:8},
  {...four[2],date:inMonthAgo(1),amount:-8,amountHKD:-8}];
 const different=createTestSuite(cross),diff=await vm.runInContext(different.boot,different.ctx);
 assert.equal(diff.widgetSummary().month,200.30);
 assert.equal(diff.widgetSummary().today,200.30);
 assert.equal(diff.widgetSummary().monthOnlyToday,false);
 assert.ok(!flatten(diff.buildWidget('large')).join('|').includes('筆交易均在今日'));
 assert.equal(app.recentTitle({merchant:'未提供商戶',category:'食飯',card:'Payme'}),'食飯 · Payme');
 const payRows=[
  {...four[0],id:'p1',amount:100,amountHKD:100,paymentType:'Online Payment'},
  {...four[1],id:'p2',amount:85,amountHKD:85,paymentType:'現金'},
  {...four[2],id:'p3',amount:15.30,amountHKD:15.30,paymentType:'八達通'}
 ];
 const payment=createTestSuite(payRows),pay=await vm.runInContext(payment.boot,payment.ctx);
 assert.equal(pay.paymentRemainder(pay.widgetSummary(),2),15.3);
 assert.ok(flatten(pay.buildWidget('large')).join('|').includes('HK$15.30'));
 const tiny=createTestSuite(rows,false);tiny.ctx.Device.screenSize=()=>({width:320});
 const phone=await vm.runInContext(tiny.boot,tiny.ctx);
 console.log('Minimum-width heights:',estimatedHeight(phone.buildWidget('small')),
  estimatedHeight(phone.buildWidget('medium')),estimatedHeight(phone.buildWidget('large')));
 assert.ok(estimatedHeight(phone.buildWidget('small'))<=141);
 assert.ok(estimatedHeight(phone.buildWidget('medium'))<=141);
 assert.ok(estimatedHeight(phone.buildWidget('large'))<=311);
 const disk=JSON.parse(fixture.disk.get(dbPath));
 assert.equal(disk.transactions[6].category,'食物');
 assert.equal(disk.transactions[8].fxStatus,'pending');
 console.log('PASS: clean-sheet responsive Widget UI, one-day density adaptation, 7-day heatstrip, iPad XL, local-storage preservation');
})().catch(e=>{console.error(e);process.exitCode=1;});
