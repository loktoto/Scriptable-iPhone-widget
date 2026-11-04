// Dependency-free independent widget SemVer / changelog / source parity guard.
// Run: node tools/check-widget-versions.js
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const families = [
 {dir:'widgets/bus-eta',pairs:[['HK-Bus-ETA.js','scripts/HK-Bus-ETA.js']]},
 {dir:'widgets/mtr-next-train',pairs:[
   ['standard/HK-MTR-Next-Train.js','scripts/HK-MTR-Next-Train.js'],
   ['adaptive/HK_MTR_Next_Train.js','scripts/HK_MTR_Next_Train.js']]},
 {dir:'widgets/expense-tracker',pairs:[
   ['HK-Expense-Tracker.js','scripts/HK-Expense-Tracker.js'],
   ['HK-Expense-Input-Diagnostic.js','scripts/HK-Expense-Input-Diagnostic.js']]}
];
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function git(...args){return cp.execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
function semver(v){
 const m=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(v||'');
 assert(m,'Invalid SemVer: '+v);
 return m.slice(1).map(Number);
}
function increased(a,b){
 const av=semver(a),bv=semver(b);
 for(let i=0;i<3;i++){if(av[i]!==bv[i])return av[i]>bv[i];}
 return false;
}
function oldFile(base,p){try{return git('show',base+':'+p);}catch(_){return null;}}
let base=process.env.BASE_SHA||'';
if(!base || /^0+$/.test(base)){try{base=git('rev-parse','HEAD^');}catch(_){base='';}}
let changed=[];
if(base){
 try{changed=git('diff','--name-only',base+'...HEAD').split(/\r?\n/).filter(Boolean);}
 catch(_){console.warn('Cannot compute Git diff; validating current file structure only.');}
}
for(const family of families){
 const metadata=JSON.parse(read(family.dir+'/VERSION.json'));
 const notes=read(family.dir+'/CHANGELOG.md');
 assert(metadata.widget && metadata.version, family.dir+' missing VERSION metadata');
 semver(metadata.version);
 assert(notes.includes('## ['+metadata.version+']'),family.dir+' changelog missing current version '+metadata.version);
 assert(fs.existsSync(path.join(root,family.dir,'README.md')),family.dir+' missing README');
 for(const [rel,legacy] of family.pairs){
   const canonical=family.dir+'/'+rel;
   const content=read(canonical);
   assert.equal(content,read(legacy),'Compatibility mirror differs: '+canonical+' vs '+legacy);
   cp.execFileSync(process.execPath,['--check',path.join(root,canonical)],{stdio:'pipe'});
 }
 const sourceChanged=family.pairs.some(([rel,legacy])=>changed.includes(family.dir+'/'+rel)||changed.includes(legacy));
 if(sourceChanged && base){
   const old=oldFile(base,family.dir+'/VERSION.json');
   if(old!==null){
     const previous=JSON.parse(old).version;
     assert(increased(metadata.version,previous),family.dir+' script changed without a higher version ('+previous+' -> '+metadata.version+')');
     assert(changed.includes(family.dir+'/CHANGELOG.md'),family.dir+' script changed without CHANGELOG update');
     const oldNotes=oldFile(base,family.dir+'/CHANGELOG.md')||'';
     assert.notEqual(notes,oldNotes,family.dir+' CHANGELOG content unchanged');
   }
 }
 console.log('PASS '+metadata.widget+' v'+metadata.version+' ('+family.pairs.length+' mirrored scripts)');
}
console.log('PASS: versions, changelogs, syntax, backward-compatible source mirrors');
