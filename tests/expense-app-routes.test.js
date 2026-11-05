// Exercise the FULL Scriptable app entry path, not only isolated helper functions.
// Regression for v3.11.0: Can't find variable: dashboard.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const file=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',file]);
const source=fs.readFileSync(file,'utf8');
async function runApp(menuChoice,queryParameters={},shortcutParameter=null,runsInApp=true,plainTexts=[]){
 const events={alerts:[],pages:[],presented:0,completed:0,errors:[],outputs:[]};
 const disk=new Map();
 const fm={
  documentsDirectory:()=>'/local',
  joinPath:(a,b)=>a+'/'+b,
  fileExists:p=>p==='/local/ExpenseTrackerHK'||disk.has(p),
  createDirectory:()=>{},
  readString:p=>{if(!disk.has(p))throw Error('Missing '+p);return disk.get(p)},
  writeString:(p,value)=>disk.set(p,value)
 };
 class Alert {
  constructor(){this.title='';this.message='';this.actions=[];events.alerts.push(this)}
  addAction(label){this.actions.push(label)}
  addCancelAction(){}
  addDestructiveAction(label){this.actions.push(label)}
  async presentSheet(){return menuChoice}
  async presentAlert(){return 0}
  addTextField(){}
 }
 class WebView {
  constructor(){this.shouldAllowRequest=null;events.web=this}
  async loadHTML(html){events.pages.push(html)}
  async present(fullscreen){events.presented++;events.fullscreen=fullscreen}
  async evaluateJavaScript(){return null}
 }
 const context={
  FileManager:{local:()=>fm},
  Script:{name:()=> 'Expense',complete:()=>events.completed++,
    setShortcutOutput:x=>events.outputs.push(x)},
  config:{runsInApp,runsInWidget:false,runsWithSiri:false,runsInActionExtension:false},
  args:{shortcutParameter,plainTexts,queryParameters},
  Alert,WebView,
  console:{log:()=>{},warn:()=>{},error:(...args)=>events.errors.push(args.join(' '))}
 };
 vm.createContext(context);
 await vm.runInContext('(async()=>{\n'+source+'\n})()',context);
 assert.equal(events.errors.length,0,'App raised a JavaScript exception: '+events.errors.join('\n'));
 assert.equal(events.completed,1,'App must finish normally');
 assert.equal(events.outputs.some(x=>x&&x.status==='error'),false,'App must not output a runtime error');
 return events;
}
(async()=>{
 const dashboard=await runApp(0);
 assert.equal(dashboard.presented,1,'Dashboard should present a WebView');
 assert.equal(dashboard.fullscreen,true);
 assert.match(dashboard.pages[0],/記帳儀表板/);
 assert.match(dashboard.pages[0],/manual-open/);
 assert.equal(typeof dashboard.web.shouldAllowRequest,'function');
 const manual=await runApp(2);
 assert.equal(manual.presented,1,'Manual menu should present a WebView');
 assert.match(manual.pages[0],/手動記帳/);
 assert.match(manual.pages[0],/id="manualForm"/);
 assert.match(manual.pages[0],/id="manualSave"/);
 assert.match(manual.pages[0],/data-category="食飯"/);
 const deepLink=await runApp(-1,{view:'dashboard'});
 assert.equal(deepLink.presented,1,'Dashboard deep link should invoke the same presenter');
 assert.match(deepLink.pages[0],/記帳儀表板/);
 const quickLink=await runApp(-1,{view:'manual'});
 assert.equal(quickLink.presented,1,'Manual link must immediately present the entry form');
 assert.match(quickLink.pages[0],/id="manualForm"/);
 assert.match(quickLink.pages[0],/id="manualSave"/);
 assert.equal(quickLink.alerts.some(a=>a.title==='Expense Tracker HK'),false,'Quick link must bypass menu');
 assert.equal(quickLink.outputs.length,0,'Quick link must not output an automatic import receipt');
 // Quick-entry text opens the interactive manual form directly via Run In App.
 const shortcutQuick=await runApp(-1,{},'EXPENSE_QUICK_MANUAL',true);
 assert.equal(shortcutQuick.presented,1,'Quick Shortcut must open an interactive WebView');
 assert.match(shortcutQuick.pages[0],/id="manualForm"/);
 assert.equal(shortcutQuick.alerts.some(a=>a.title==='Expense Tracker HK'),false,'Quick Shortcut must skip the main menu');
 assert.equal(shortcutQuick.outputs.length,0,'Quick Shortcut must not be processed as an expense transaction');
 const textListQuick=await runApp(-1,{},null,true,['EXPENSE_QUICK_MANUAL']);
 assert.equal(textListQuick.presented,1,'Command in Texts must open manual WebView');
 assert.match(textListQuick.pages[0],/id="manualForm"/);
 assert.equal(textListQuick.outputs.length,0,'Texts control command is not a purchase');
 const paddedTexts=await runApp(-1,{},null,true,['   EXPENSE_QUICK_MANUAL  ']);
 assert.equal(paddedTexts.presented,1,'Trim Texts command whitespace');
 const textsNeedsApp=await runApp(-1,{},null,false,['EXPENSE_QUICK_MANUAL']);
 assert.equal(textsNeedsApp.presented,0);
 assert.equal(textsNeedsApp.outputs[0].status,'quick_requires_app');
 assert.match(textsNeedsApp.outputs[0].receipt,/Texts/);
 const multipleTexts=await runApp(-1,{},null,true,['EXPENSE_QUICK_MANUAL','ordinary note']);
 assert.equal(multipleTexts.presented,0,'Multiple Texts must not be treated as control command');
 const normalText=await runApp(-1,{},null,true,['ordinary note']);
 assert.equal(normalText.presented,0,'Unrelated text must not invoke the form');
 const wallet={merchantName:'Demo Restaurant',merchantType:'Restaurants',amount:57,currency:'HKD',card:'SAMPLE CARD',date:'20261104_203328'};
 const walletAndTexts=await runApp(-1,{view:'manual'},wallet,true,['EXPENSE_QUICK_MANUAL']);
 assert.equal(walletAndTexts.presented,0,'Wallet Dictionary must override Texts quick command');
 assert.equal(walletAndTexts.outputs[0].status,'saved','Wallet transaction must still save');
 const requiresApp=await runApp(-1,{},'EXPENSE_QUICK_MANUAL',false);
 assert.equal(requiresApp.presented,0,'Run In App OFF must not attempt an interactive form');
 assert.equal(requiresApp.outputs[0].status,'quick_requires_app');
 assert.match(requiresApp.outputs[0].receipt,/Run In App/);
 // URL invocations must not be lost to the !config.runsInApp branch.
 const urlNotApp=await runApp(-1,{view:'manual'},null,false);
 assert.equal(urlNotApp.presented,1);
 assert.match(urlNotApp.pages[0],/id="manualForm"/);
 const exit=await runApp(-1);
 assert.equal(exit.presented,0,'Cancel should not show a WebView');
 console.log('PASS: full Scriptable app Dashboard, manual entry, one-tap Shortcut Parameter and Texts, Wallet priority, URL deep links, Run In App guard, Dashboard and cancel');
})().catch(e=>{console.error(e);process.exitCode=1;});
