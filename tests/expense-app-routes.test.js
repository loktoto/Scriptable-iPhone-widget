// Exercise the FULL Scriptable app entry path, not only isolated helper functions.
// Regression for v3.11.0: Can't find variable: dashboard.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const cp=require('node:child_process'),assert=require('node:assert/strict');
const file=path.join(__dirname,'..','widgets/expense-tracker/HK-Expense-Tracker.js');
cp.execFileSync(process.execPath,['--check',file]);
const source=fs.readFileSync(file,'utf8');
async function runApp(menuChoice,queryParameters={}){
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
  config:{runsInApp:true,runsInWidget:false,runsWithSiri:false,runsInActionExtension:false},
  args:{shortcutParameter:null,plainTexts:[],queryParameters},
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
 assert.match(manual.pages[0],/手動支出記錄/);
 assert.match(manual.pages[0],/id="manualForm"/);
 assert.match(manual.pages[0],/id="manualSave"/);
 assert.match(manual.pages[0],/data-category="餐飲"/);
 const deepLink=await runApp(-1,{view:'dashboard'});
 assert.equal(deepLink.presented,1,'Dashboard deep link should invoke the same presenter');
 assert.match(deepLink.pages[0],/記帳儀表板/);
 const exit=await runApp(-1);
 assert.equal(exit.presented,0,'Cancel should not show a WebView');
 console.log('PASS: full Scriptable app Dashboard, manual entry, Dashboard deep link, cancel and no runtime errors');
})().catch(e=>{console.error(e);process.exitCode=1;});
