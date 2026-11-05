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
 fillEllipse(rect){this.draws.push({type:'ellipse',rect})}
 addPath(path){this.draws.push({type:'path',points:path.points})}
 fillPath(){this.draws.push({type:'fill-path'})}
 setFont(){}
 setTextColor(){}
 setTextAlignedCenter(){}
 drawTextInRect(text,rect){this.draws.push({type:'label',text,rect})}
 getImage(){return {type:'drawn-image',size:this.size,draws:this.draws}}
}
class Size{constructor(width,height){this.width=width;this.height=height}}
class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
class Color{constructor(x){this.value=x}}
class Point{constructor(x,y){this.x=x;this.y=y}}
class Path{constructor(){this.points=[]} move(p){this.points.push(p)} addLine(p){this.points.push(p)} closeSubpath(){}}
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
  Size,Rect,DrawContext,Point,Path,ListWidget:MockWidget,URLScheme:{forRunningScript:()=>'scriptable:///run?scriptName=Expense'},
  Device:{screenSize:()=>({width:pad?1024:393}),isPad:()=>pad},console};
 vm.createContext(ctx);
 const boot='(async()=>{\n'+script.slice(0,cut)+
  '\nreturn {buildWidget,widgetSummary,chartPoints,monthChartPoints,makePieChart,makeDonutChart,makeStackedChart,donutParts,previewWidget,db,recentTitle};\n}\nreturn await runExpenseTrackerHK();\n})()';
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
 const verticalSpacing=node.direction==='horizontal'?0:Math.max(0,sizes.length-1)*(node.spacing||0);
 return inner+(pad[0]||0)+(pad[2]||0)+verticalSpacing;
}
function graphs(node){
 const items=[];(function visit(x){
  if(x.type==='image'&&x.content.type==='drawn-image'&&x.content.size.height>10)items.push(x.content);
  if(x.children)for(const ch of x.children)visit(ch);
 })(node);return items;
}
(async()=>{
 const suite=createTestSuite(),app=await vm.runInContext(suite.boot,suite.ctx);
 const summary=app.widgetSummary();
 assert.equal(summary.today,85,'Today is 57+16+12');
 assert.equal(summary.todayCount,3,'Today resolved-HKD transaction count');
 assert.equal(summary.todayRecordedCount,3,'Header count is TODAY, not month count');
 assert.equal(summary.month,218,'Monthly net amount includes refunds');
 assert.equal(summary.txCount,8);
 assert.equal(summary.gross,228);
 assert.equal(summary.refundValue,10);
 assert.equal(summary.unresolved,1);
 assert.ok(summary.grossCats.some(([name,value])=>name==='食飯'&&value===69));
 assert.ok(summary.grossPayments.some(([name])=>name==='__proto__'));
 const days=app.monthChartPoints(summary.byDay);
 assert.equal(days.length,d.getDate(),'Month-to-date bars start on the 1st and end today');
 assert.equal(days[0].label,'1');
 assert.equal(days[days.length-1].label,String(d.getDate()));
 assert.equal(days[days.length-1].value,85);
 const drawImages=node=>{
   const out=[];(function visit(x){
     if(x.type==='image'&&x.content.type==='drawn-image')out.push(x.content);
     for(const child of x.children||[])visit(child);
   })(node);return out;
 };
 const small=app.buildWidget('small'),medium=app.buildWidget('medium'),
       large=app.buildWidget('large');
 const sm=flatten(small).join('|'),md=flatten(medium).join('|'),lg=flatten(large).join('|');
 assert.ok(sm.includes('今日支出')&&sm.includes('3筆'));
 assert.ok(sm.includes('HK$85.00')&&sm.includes('本月支出')&&sm.includes('HK$218.00'));
 assert.ok(!sm.includes('最多分類')&&!sm.includes('近7日'),'Small removes category and last-7-day headers');
 assert.equal(drawImages(small).length,1);
 assert.equal(drawImages(small)[0].size.height,40,'Small month chart expands well beyond v3.21 chart');
 assert.ok(sm.includes('1日')&&sm.includes('日（今日）'),'Monthly daily axis labels actual dates');
 assert.ok(md.includes('今日支出')&&md.includes('HK$85.00'));
 assert.ok(md.includes('本月支出')&&md.includes('HK$218.00'));
 assert.ok(md.includes('本月分類')&&!md.includes('退款前'),'Medium label must omit 退款前');

 assert.equal(drawImages(medium).length,2,'Medium must be LEFT Small+RIGHT solid category PIE');
 const pie=drawImages(medium)[1];
 assert.ok(pie.draws.some(x=>x.type==='fill-path'),'Pie must have colored sector paths');
 assert.equal(pie.draws.filter(x=>x.type==='ellipse').length,1,
   'Pie is SOLID: background disc only, no center hole as in donut');
 // Medium category Pie must share a horizontal row with its compact legend.
 const hasInlinePieAndLegend=node=>{
   if(node.direction==='horizontal'){
     const kids=(node.children||[]).filter(x=>x.type==='stack');
     if(kids.length===2){
       const leftImages=graphs(kids[0]);
       const rightLabels=flatten(kids[1]);
       if(leftImages.some(x=>x.draws.some(y=>y.type==='fill-path'))&&
          rightLabels.some(x=>/^\d+%$/.test(x))&&rightLabels.length>=3) return true;
     }
   }
   return (node.children||[]).some(hasInlinePieAndLegend);
 };
 assert.ok(hasInlinePieAndLegend(medium),'Medium must align the Pie and legend side-by-side');
 const inlineLabels=flatten(medium);
 assert.ok(inlineLabels.some(x=>/^\d+%$/.test(x)),'Pie legend retains category percentages');

 assert.ok(!md.includes('近7日')&&!md.includes('最近14日'));
 assert.ok(lg.includes('今日3筆')&&lg.includes('本月8筆'));
 assert.ok(lg.includes('今日支出')&&lg.includes('本月支出'));
 assert.ok(lg.includes('本月每日淨支出')&&lg.includes('分類'));
 assert.ok(lg.includes('付款')&&lg.includes('最近交易')&&!lg.includes('退款前'));
 assert.ok(!md.includes('退款前')&&!lg.includes('退款前'));
 assert.equal(drawImages(large).length,3,'Large includes monthly bars, pie and payment shares');
 const largePie=drawImages(large)[1];
 assert.ok(largePie.draws.some(x=>x.type==='fill-path'));
 assert.equal(largePie.draws.filter(x=>x.type==='ellipse').length,1);
 assert.ok(drawImages(large).some(x=>x.size.height===15));
 for(const w of [small,medium,large])
   assert.ok(textNodes(w).every(x=>x.font?.size>=11),'No small text shrinking below 11pt');
 console.log('393pt heights (Small/Medium/Large)',estimatedHeight(small),
   estimatedHeight(medium),estimatedHeight(large));
 console.log('Small block heights',small.children.map((x,i)=>[i,estimatedHeight(x),flatten(x).slice(0,2)]));
 console.log('Large block heights',large.children.map((x,i)=>[i,estimatedHeight(x),flatten(x).slice(0,2)]));
 assert.ok(estimatedHeight(small)<=158);
 assert.ok(estimatedHeight(medium)<=158);
 assert.ok(estimatedHeight(large)<=354);
 assert.equal(small.url,'scriptable:///run?scriptName=Expense&view=dashboard');
 assert.ok(Number.isFinite(new Date(small.refreshAfterDate).getTime()));
 suite.args.widgetParameter='quick';
 assert.equal(app.buildWidget('small').url,'scriptable:///run?scriptName=Expense&view=manual');
 for(const accessory of ['accessoryInline','accessoryCircular','accessoryRectangular']){
   assert.ok(flatten(app.buildWidget(accessory)).length>0);
 }
 const iPadSuite=createTestSuite(rows,true),pad=await vm.runInContext(iPadSuite.boot,iPadSuite.ctx);
 const xl=pad.buildWidget('extraLarge');
 assert.equal(drawImages(xl).length,4);
 assert.ok(estimatedHeight(xl)<=378.5,'Full-size iPad XL height');
 const tinyPadSuite=createTestSuite(rows,true);
 tinyPadSuite.ctx.Device.screenSize=()=>({width:768});
 const tinyPad=await vm.runInContext(tinyPadSuite.boot,tinyPadSuite.ctx);
 assert.ok(estimatedHeight(tinyPad.buildWidget('extraLarge'))<=305.5);
 const emptySuite=createTestSuite([],true),empty=await vm.runInContext(emptySuite.boot,emptySuite.ctx);
 for(const fam of ['small','medium','large','extraLarge']){
   const labels=flatten(empty.buildWidget(fam)).join('|');
   assert.ok(labels.includes('HK$0.00')&&!labels.includes('NaN')&&!labels.includes('undefined'));
 }
 const netZero=[
   {...rows[0],id:'positive',amount:5,amountHKD:5},
   {...rows[0],id:'refund',amount:-5,amountHKD:-5}
 ];
 const zeroSuite=createTestSuite(netZero),zero=await vm.runInContext(zeroSuite.boot,zeroSuite.ctx);
 assert.equal(zero.widgetSummary().today,0);
 assert.equal(zero.widgetSummary().month,0);
 assert.equal(zero.widgetSummary().gross,5);
 assert.equal(zero.widgetSummary().refundValue,5);
 assert.ok(drawImages(zero.buildWidget('medium'))[1].draws.some(x=>x.type==='fill-path'),
   'Pie charts must still reflect positive spending when refunds offset net');
 const four=[50,50,50,50.3].map((amount,i)=>({
   id:'demo-'+i,date:today,merchant:'未提供商戶',category:i===0?'訂閱':'食飯',
   card:'Payme',amount,amountHKD:amount,currency:'HKD'
 }));
 const fourSuite=createTestSuite(four),fourApp=await vm.runInContext(fourSuite.boot,fourSuite.ctx);
 assert.equal(fourApp.widgetSummary().today,200.3);
 assert.equal(fourApp.widgetSummary().month,200.3);
 assert.equal(fourApp.widgetSummary().todayCount,4);
 for(const fam of ['small','medium']){
   const labels=flatten(fourApp.buildWidget(fam)).join('|');
   assert.equal((labels.match(/HK\$200\.30/g)||[]).length,2,
     'Today and month are distinct KPIs even if amounts happen to be equal');
 }
 assert.ok(flatten(fourApp.buildWidget('medium')).join('|').includes('本月分類'));
 const cross=[
   {...four[0],amount:200.3,amountHKD:200.3},
   {...four[1],date:inMonthAgo(1),amount:8,amountHKD:8},
   {...four[2],date:inMonthAgo(1),amount:-8,amountHKD:-8}
 ];
 const crossSuite=createTestSuite(cross),crossApp=await vm.runInContext(crossSuite.boot,crossSuite.ctx);
 assert.equal(crossApp.widgetSummary().month,200.3);
 assert.equal(crossApp.widgetSummary().monthOnlyToday,false);
 const pendingNow=[...rows,{...rows[8],id:'pending-today',date:today}];
 const fxSuite=createTestSuite(pendingNow),fxApp=await vm.runInContext(fxSuite.boot,fxSuite.ctx);
 assert.equal(fxApp.widgetSummary().todayRecordedCount,4,
   'Today recorded nonzero transactions include the pending FX charge');
 assert.equal(fxApp.widgetSummary().todayCount,3,
   'Today resolved-HKD count excludes unconverted foreign currency');
 assert.equal(fxApp.widgetSummary().today,85,'Pending FX never contaminates HKD spend');
 assert.ok(flatten(fxApp.buildWidget('small')).join('|').includes('4筆 ⚠'),
   'A pending entry increases today count but must retain a warning');
 const tinySuite=createTestSuite(rows,false);
 tinySuite.ctx.Device.screenSize=()=>({width:320});
 const tiny=await vm.runInContext(tinySuite.boot,tinySuite.ctx);
 console.log('320pt heights (Small/Medium/Large)',
   estimatedHeight(tiny.buildWidget('small')),
   estimatedHeight(tiny.buildWidget('medium')),
   estimatedHeight(tiny.buildWidget('large')));
 assert.ok(estimatedHeight(tiny.buildWidget('small'))<=141);
 assert.ok(estimatedHeight(tiny.buildWidget('medium'))<=141);
 assert.ok(estimatedHeight(tiny.buildWidget('large'))<=311);
 const saved=JSON.parse(suite.disk.get(dbPath));
 assert.equal(saved.transactions[6].category,'食物');
 assert.equal(saved.transactions[8].fxStatus,'pending');
 console.log('PASS: Small today-first month bar; Medium true solid PIE; Large redesigned; original ledger intact');
})().catch(e=>{console.error(e);process.exitCode=1;});
