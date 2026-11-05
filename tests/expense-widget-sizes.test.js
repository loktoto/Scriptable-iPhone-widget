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
  '\nreturn {buildWidget,widgetSummary,chartPoints,makeBarChart,makeDonutChart,makeStackedChart,donutParts,previewWidget,db,recentTitle};\n}\nreturn await runExpenseTrackerHK();\n})()';
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
 const suite=createTestSuite(),app=await vm.runInContext(suite.boot,suite.ctx);
 const summary=app.widgetSummary();
 assert.equal(summary.month,218,'Net HKD amount must include refund');
 assert.equal(summary.gross,228,'Gross is sum of positive charges only');
 assert.equal(summary.refundValue,10);
 assert.equal(summary.txCount,8);
 assert.equal(summary.unresolved,1);
 assert.ok(summary.grossCats.some(([c,v])=>c==='食飯'&&v===69));
 assert.ok(summary.monthlyCats.some(([c,v])=>c==='食飯'&&v===59));
 assert.ok(summary.grossPayments.some(([p])=>p==='__proto__'));
 assert.equal(summary.sixMonths.length,6);
 assert.equal(summary.recent.length,6);
 const drawImages=node=>{
   const result=[];(function visit(x){
     if(x.type==='image'&&x.content.type==='drawn-image')result.push(x.content);
     for(const child of x.children||[])visit(child);
   })(node);return result;
 };
 const small=app.buildWidget('small'),medium=app.buildWidget('medium'),
       large=app.buildWidget('large');
 const s=flatten(small).join('|'),m=flatten(medium).join('|'),l=flatten(large).join('|');
 assert.ok(s.includes('近7日')&&s.includes('最多分類'));
 assert.ok(s.includes('HK$218.00'));
 assert.equal(drawImages(small).length,1);
 assert.equal(drawImages(small)[0].size.height,26);
 assert.ok(m.includes('最近14日')&&m.includes('分類'));
 assert.equal(drawImages(medium).length,2,'Medium must have daily trend + category stacked chart');
 assert.ok(drawImages(medium).some(x=>x.size.height===9));
 assert.ok(l.includes('支出分類')&&l.includes('付款構成')&&l.includes('最近交易'));
 assert.equal(drawImages(large).length,3,'Large: daily bars, donut and payment stacked bar');
 assert.ok(drawImages(large).some(x=>x.draws.some(y=>y.type==='fill-path')),
   'Donut must actually render native Path sectors, not merely a title');
 assert.ok(drawImages(large).some(x=>x.size.height===12),
   'Payment composition chart must be rendered');
 for(const family of [small,medium,large]){
   assert.ok(textNodes(family).every(x=>x.font?.size>=11));
 }
 console.log('393pt estimated widget heights',estimatedHeight(small),
   estimatedHeight(medium),estimatedHeight(large));
 assert.ok(estimatedHeight(small)<=158);
 assert.ok(estimatedHeight(medium)<=158);
 assert.ok(estimatedHeight(large)<=354);
 assert.equal(small.url,'scriptable:///run?scriptName=Expense&view=dashboard');
 assert.ok(Number.isFinite(new Date(small.refreshAfterDate).getTime()));
 suite.args.widgetParameter='quick';
 assert.equal(app.buildWidget('small').url,'scriptable:///run?scriptName=Expense&view=manual');
 for(const accessory of ['accessoryInline','accessoryCircular','accessoryRectangular']){
   assert.ok(flatten(app.buildWidget(accessory)).join('|').includes('本月'));
 }
 const ipad=createTestSuite(rows,true),pad=await vm.runInContext(ipad.boot,ipad.ctx);
 const xl=pad.buildWidget('extraLarge'),xt=flatten(xl).join('|'),xlCharts=drawImages(xl);
 assert.ok(xt.includes('財務分析')&&xt.includes('最近30日')&&xt.includes('最近6個月'));
 assert.ok(xt.includes('分類 · 正向支出')&&xt.includes('付款構成'));
 assert.ok(xt.includes('最近六筆交易'));
 assert.equal(xlCharts.length,4,'iPad XL needs 30-day, 6mo, donut, payment distribution');
 assert.ok(xlCharts.some(x=>x.draws.some(y=>y.type==='fill-path')));
 assert.ok(estimatedHeight(xl)<=305.5,'Smallest iPad XL 305.5pt canvas must fit');
 const emptySuite=createTestSuite([],true),empty=await vm.runInContext(emptySuite.boot,emptySuite.ctx);
 for(const family of ['small','medium','large','extraLarge']){
   const node=empty.buildWidget(family),labels=flatten(node).join('|');
   assert.ok(labels.includes('HK$0.00'));
   assert.ok(!labels.includes('NaN')&&!labels.includes('undefined'));
 }
 const netZero=[{...rows[0],id:'plus',amount:5,amountHKD:5},
                {...rows[0],id:'minus',amount:-5,amountHKD:-5}];
 const zSuite=createTestSuite(netZero),zero=await vm.runInContext(zSuite.boot,zSuite.ctx);
 assert.equal(zero.widgetSummary().month,0);
 assert.equal(zero.widgetSummary().gross,5);
 assert.equal(zero.widgetSummary().refundValue,5);
 assert.equal(zero.widgetSummary().grossCats[0][1],5);
 const four=[50,50,50,50.3].map((amount,i)=>({
   id:'test-'+i,date:today,merchant:'未提供商戶',
   category:i===0?'訂閱':'食飯',card:'Payme',amount,amountHKD:amount,currency:'HKD'
 }));
 const oneSuite=createTestSuite(four),one=await vm.runInContext(oneSuite.boot,oneSuite.ctx);
 assert.equal(one.widgetSummary().month,200.3);
 assert.equal(one.widgetSummary().gross,200.3);
 assert.equal(one.widgetSummary().fourteenActive,1);
 assert.equal((flatten(one.buildWidget('small')).join('|').match(/HK\$200\.30/g)||[]).length,1);
 assert.equal((flatten(one.buildWidget('medium')).join('|').match(/HK\$200\.30/g)||[]).length,1);
 assert.equal(drawImages(one.buildWidget('medium')).length,2,
   'Single active day must still use meaningful charts with correct numbers');
 const past=[{...four[0],amount:200.30,amountHKD:200.30},
   {...four[1],date:inMonthAgo(1),amount:8,amountHKD:8},
   {...four[2],date:inMonthAgo(1),amount:-8,amountHKD:-8}];
 const oldSuite=createTestSuite(past),oldApp=await vm.runInContext(oldSuite.boot,oldSuite.ctx);
 assert.equal(oldApp.widgetSummary().month,200.3);
 assert.equal(oldApp.widgetSummary().monthOnlyToday,false);
 assert.equal(app.recentTitle({merchant:'未提供商戶',category:'食飯',card:'Payme'}),'食飯 · Payme');
 const tinySuite=createTestSuite(rows,false);
 tinySuite.ctx.Device.screenSize=()=>({width:320});
 const tiny=await vm.runInContext(tinySuite.boot,tinySuite.ctx);
 console.log('320pt estimated heights',estimatedHeight(tiny.buildWidget('small')),
   estimatedHeight(tiny.buildWidget('medium')),estimatedHeight(tiny.buildWidget('large')));
 assert.ok(estimatedHeight(tiny.buildWidget('small'))<=141);
 assert.ok(estimatedHeight(tiny.buildWidget('medium'))<=141);
 assert.ok(estimatedHeight(tiny.buildWidget('large'))<=311);
 const onDisk=JSON.parse(suite.disk.get(dbPath));
 assert.equal(onDisk.transactions[6].category,'食物');
 assert.equal(onDisk.transactions[8].fxStatus,'pending');
 console.log('PASS charts-first widget families, gross-vs-net chart invariants and local-ledger preservation');
})().catch(e=>{console.error(e);process.exitCode=1;});
