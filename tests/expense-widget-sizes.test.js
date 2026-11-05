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
  '\nreturn {buildWidget,widgetSummary,chartPoints,makeBarChart,previewWidget,db};\n}\nreturn await runExpenseTrackerHK();\n})()';
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
 const fixture=createTestSuite();
 const app=await vm.runInContext(fixture.boot,fixture.ctx);
 const summary=app.widgetSummary();
 assert.equal(summary.month,218,'Known synthetic monthly HKD net');
 assert.equal(summary.txCount,8,'Pending FX excluded from HKD count');
 assert.equal(summary.unresolved,1,'Pending FX remains visible');
 assert.ok(summary.monthlyCats.some(([k,v])=>k==='食飯'&&v===59),'Legacy 食物 merged with new 食飯');
 assert.ok(summary.monthlyPayments.some(([k])=>k==='Payme'));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='My Custom QR'));
 assert.ok(summary.monthlyPayments.some(([k])=>k==='__proto__'),'Prototype-like custom method must not corrupt groups');
 assert.equal(summary.recent.length,6);
 assert.equal(summary.sixMonths.length,6);
 const small=app.buildWidget('small'),medium=app.buildWidget('medium'),large=app.buildWidget('large');
 const st=flatten(small).join('|'),mt=flatten(medium).join('|'),lt=flatten(large).join('|');
 assert.ok(st.includes('月開支'),'Small title must fit');
 assert.ok(st.includes('今日'),'Small must show today expense');
 assert.ok(st.includes('近7日'),'Small must show seven-day total');
 assert.ok(st.includes('8筆'),'Small retains current-month transaction count');
 assert.equal(graphs(small).length,1,'Small MUST restore a seven-day chart');
 assert.equal(graphs(small)[0].size.height,29,'Small chart must remain a readable, compact seven-day plot');
 assert.equal(app.chartPoints(summary.byDay,7).length,7,'Seven real day buckets required');
 assert.ok(textNodes(small).every(n=>n.font?.size>=11),'All native text on Small must be >= 11pt');
 assert.ok(estimatedHeight(small)<=141,'Approximate Small vertical layout must fit the smallest documented 141pt height');
 assert.ok(st.includes('一')||st.includes('日'),'Native weekday glyphs must be visible');
 assert.ok(!st.includes('HK$218.00|HK$218.00|HK$218.00'),
   'Small should not repeat identical figures three times');
 const smallNativeLabels=flatten(small).filter(x=>['日','一','二','三','四','五','六'].includes(x));
 assert.equal(smallNativeLabels.length,7,'Show all seven native-text weekday labels');
 assert.ok(!st.includes('14日')&&!st.includes('分類 Top 3'),'Small is not a shrunken Medium/Large');
 assert.equal(graphs(medium).length,1);
 assert.ok(mt.includes('14日支出趨勢'));
 assert.ok(mt.includes('近7日'));
 assert.ok(mt.includes('最多 訂閱'),'Medium must show the largest category (訂閱 HK$70)');
 assert.ok(!mt.includes('最近交易'),'Medium must NOT mimic Large');
 assert.ok(lt.includes('本月分類 TOP 3'));
 assert.ok(lt.includes('付款方式 TOP 2'));
 assert.ok(lt.includes('最近交易'));
 assert.ok(lt.includes('Payme'));
 assert.ok(lt.includes('Lunch Cafe'));
 assert.equal(graphs(large).length,1,'Large should use one chart plus ranked categories and transactions');
 console.log('Estimated heights 393pt screen: Small '+estimatedHeight(small)+', Medium '+estimatedHeight(medium)+', Large '+estimatedHeight(large));
 assert.ok(estimatedHeight(large)<=311,'Large must fit conservative 311pt iPhone size');
 assert.ok(estimatedHeight(medium)<=158,'Medium must fit 158pt iPhone size');
 const wideRows=large.children.filter(x=>x?.type==='stack');
 assert.ok(wideRows.length>0,'Large must have a structured stacked layout');
 for(const accessory of ['accessoryInline','accessoryCircular','accessoryRectangular']){
   const widget=app.buildWidget(accessory),labels=flatten(widget).join('|');
   assert.ok(labels.length>0,'Lock-screen accessory must show at least one value');
   assert.equal(graphs(widget).length,0,'Accessory should not render complex charts');
 }
 assert.equal(small.url,'scriptable:///run?scriptName=Expense&view=dashboard');
 assert.ok(Number.isFinite(new Date(small.refreshAfterDate).getTime()),'Refresh request must contain a valid date');
 fixture.args.widgetParameter='quick';
 assert.equal(app.buildWidget('small').url,'scriptable:///run?scriptName=Expense&view=manual');
 const ipad=createTestSuite(rows,true);
 const ipadApp=await vm.runInContext(ipad.boot,ipad.ctx);
 const xl=ipadApp.buildWidget('extraLarge');
 const xt=flatten(xl).join('|');
 assert.ok(xt.includes('開支分析 · iPad'));
 assert.ok(xt.includes('最近30日'));
 assert.ok(xt.includes('最近6個月'));
 assert.ok(xt.includes('分類 TOP 5'));
 assert.ok(xt.includes('付款方式 TOP 3'));
 assert.ok(xt.includes('最近6筆交易'));
 assert.ok(xt.includes('本月退款'));
 assert.ok(xt.includes('Lunch Cafe'),'iPad XL must include actual transactions');
 assert.equal(graphs(xl).length,2,'iPad XL must have both 30-day AND six-month charts');
 assert.ok(xt.includes('Payme'));
 assert.ok(xt.includes('⚠ 1筆待核對'));
 const widths=graphs(xl).map(x=>x.size.width);
 assert.ok(widths.every(x=>x>150&&x<=665),'iPad charts must use bounded widths');
 const empty=createTestSuite([],true),emptyApp=await vm.runInContext(empty.boot,empty.ctx);
 for(const size of ['small','medium','large','extraLarge']){
   const w=emptyApp.buildWidget(size),out=flatten(w).join('|');
   assert.ok(out.includes('HK$0.00'),'No-data view must display honest 0 monthly value');
   assert.ok(!out.includes('NaN')&&!out.includes('undefined'));
 }
 // Same-day charge and full refund is a zero-net, but ACTIVE, record group.
 const cancelRows=[
   {...rows[0],id:'cancel-spend',amount:5,amountHKD:5},
   {...rows[0],id:'cancel-refund',amount:-5,amountHKD:-5}
 ];
 const zero=createTestSuite(cancelRows),zeroApp=await vm.runInContext(zero.boot,zero.ctx);
 const zeroSummary=zeroApp.widgetSummary();
 assert.equal(zeroSummary.month,0);
 assert.ok(zeroSummary.monthlyCats.some(([name,v])=>name==='食飯'&&v===0),'Active zero-net category must remain visible');
 assert.ok(zeroSummary.monthlyPayments.some(([name,v])=>name==='Payme'&&v===0),'Active zero-net payment must remain visible');
 // User screenshot regression: 4 purchases today = month/today/week HK$200.30.
 const sameDayRows=[50,50,50,50.30].map((n,i)=>({
   id:'same-'+i,date:today,merchant:'Quick '+i,category:'食飯',
   amount:n,amountHKD:n,currency:'HKD',card:'Payme'
 }));
 const sameDay=createTestSuite(sameDayRows),sameApp=await vm.runInContext(sameDay.boot,sameDay.ctx);
 const sameSmall=sameApp.buildWidget('small');
 const sameLabels=flatten(sameSmall).join('|');
 assert.equal((sameLabels.match(/HK\$200\.30/g)||[]).length,1,
   'Screenshot case: month/today/week same value must be printed just once');
 assert.ok(sameLabels.includes('本月全部'),'Today relationship must be explained instead of duplicated');
 assert.ok(sameLabels.includes('1日有紀錄'),'Week activity count replaces redundant third amount');
 assert.equal(graphs(sameSmall)[0].size.height,29);
 assert.ok(estimatedHeight(sameSmall)<=141,'Small must fit a conservative 141pt canvas');
 const smallScreen=createTestSuite(rows,false);
 smallScreen.ctx.Device.screenSize=()=>({width:320});
 const mobile=await vm.runInContext(smallScreen.boot,smallScreen.ctx);
 assert.ok(estimatedHeight(mobile.buildWidget('medium'))<=141,'320pt iPhone Medium must fit 141pt height');
 assert.ok(estimatedHeight(mobile.buildWidget('large'))<=311,'320pt iPhone Large must fit 311pt height');
 const stable=JSON.parse(fixture.disk.get(dbPath));
 assert.equal(stable.transactions[6].category,'食物','Viewing widgets must NOT migrate source rows');
 assert.equal(stable.transactions[8].fxStatus,'pending','Widgets must not call FX or mutate pending records');
 console.log('PASS: All four redesigned sizes with visual density and screenshot regression, paired charts, prototype-safe payment groups, refunds, pending FX, empty states and quick link');
})().catch(e=>{console.error(e);process.exitCode=1});
