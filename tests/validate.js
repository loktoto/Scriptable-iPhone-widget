// Dependency-free checks. No live HTTP calls.
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const cp=require('node:child_process'), assert=require('node:assert/strict');
function loader(filename,main){
 const filenameAbs=path.join(__dirname,'..','scripts',filename);
 cp.execFileSync(process.execPath,['--check',filenameAbs]);
 const raw=fs.readFileSync(filenameAbs,'utf8'), cut=raw.lastIndexOf(main);
 assert(cut>0,'entrypoint not found');
 const fm={documentsDirectory:()=>'/tmp',joinPath:(...a)=>a.join('/'),fileExists:()=>false,createDirectory:()=>{},readString:()=>null,writeString:()=>{},copy:()=>{}};
 const ctx=vm.createContext({FileManager:{local:()=>fm},Script:{name:()=>filename},
   config:{runsInWidget:false},Timer:{schedule:()=>({invalidate(){}})},console,Date});
 vm.runInContext(raw.slice(0,cut),ctx,{timeout:1000});
 return expr=>vm.runInContext(expr,ctx,{timeout:500});
}
const bus=loader('HK-Bus-ETA.js','if (config.runsInWidget)');
const mtr=loader('HK-MTR-Next-Train.js','if(config.runsInWidget)');
assert.equal(bus("getRefreshPlan(new Date('2026-10-26T23:30:00Z')).mode"),'通勤');
assert.equal(bus("getRefreshPlan(new Date('2026-10-26T23:20:00Z')).mode"),'通勤預備');
assert.equal(bus("(getRefreshPlan(new Date('2026-10-27T04:00:00Z')).next-new Date('2026-10-27T04:00:00Z'))/60000"),30);
assert.equal(bus("(getRefreshPlan(new Date('2026-10-31T02:00:00Z')).next-new Date('2026-10-31T02:00:00Z'))/60000"),60);
assert.equal(bus("hktSeconds(new Date('2026-10-30T09:34:21Z'))"),'17:34:21');
assert.equal(bus("(prefs.adaptiveEnabled=false,getRefreshPlan(new Date('2026-10-31T02:00:00Z')).mode)"),'固定');
assert.equal(mtr("refreshPlan(new Date('2026-10-26T23:30:00Z')).mode"),'通勤');
assert.equal(mtr("(refreshPlan(new Date('2026-10-27T04:00:00Z')).next-new Date('2026-10-27T04:00:00Z'))/60000"),5);
assert.equal(mtr("(refreshPlan(new Date('2026-10-31T02:00:00Z')).next-new Date('2026-10-31T02:00:00Z'))/60000"),15);
assert.equal(mtr("parseHK('2026-10-30 17:34:00').toISOString()"),'2026-10-30T09:34:00.000Z');
assert.equal(mtr("directionTitle({line:'TWL',direction:'DOWN'})"),'往中環');
assert.equal(mtr("(pref.adaptive=false,refreshPlan(new Date('2026-10-31T02:00:00Z')).mode)"),'固定');
console.log('PASS: syntax, weekday/commute logic, warm-up, HKT, direction and adaptive OFF');
