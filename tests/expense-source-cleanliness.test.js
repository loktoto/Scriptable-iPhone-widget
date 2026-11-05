// Lightweight, automated code-health gate for canonical Scriptable entrypoints.
// Does not replace a security penetration test or iPhone/iPad visual inspection.
const assert=require('node:assert/strict');
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const canonical='widgets/expense-tracker/HK-Expense-Tracker.js';
const src=read(canonical);
assert.equal(src,read('scripts/HK-Expense-Tracker.js'),
 'Intentional Scriptable compatibility mirror must be EXACTLY equal to canonical source');
assert.match(src,/v3\.22\.1/);
const version=JSON.parse(read('widgets/expense-tracker/VERSION.json'));
assert.equal(version.version,'3.22.1');
assert.match(read('widgets/expense-tracker/CHANGELOG.md'),/## \[3\.22\.1\]/);
assert.match(read('docs/EXPENSE_WIDGET_RESEARCH_AND_AUDIT.md'),/Independent Widget Research/);
for(const removed of ['function barsSVG(', 'function fmt(']){
 assert.ok(!src.includes(removed),'Unused pre-v3.13 chart helper is still in canonical script: '+removed);
}
assert.ok(src.includes('const r=Object.create(null);'),'Dictionary aggregation must avoid inherited keys');
assert.ok(src.includes('const byDay=Object.create(null),byMonth=Object.create(null);'));
assert.ok(src.includes('catCount[cat]=(catCount[cat]||0)+1;'),
 'Canceling spend and refund must still count as activity');
assert.match(src,/function widgetSummary\(\)/);
assert.ok(src.includes('grossCats:'),'Donut must use gross positive spending, not signed net totals');
assert.match(src,/function makeDonutChart\(/);
assert.match(src,/function makeStackedChart\(/);
assert.match(src,/function makePieChart\(/);
assert.ok(src.includes('addPieChart(pieBox,s.grossCats,pieSize,3)'));
assert.ok(src.includes('addInlinePieLegend(legendBox,s.grossCats,s.gross,compact)'));
assert.ok(!src.includes("sectionLine(right,'本月分類','退款前')"));
assert.ok(!src.includes("sectionLine(categories,'分類 · 退款前')"));
assert.ok(!src.includes("sectionLine(payment,'付款 · 退款前')"));
assert.match(src,/addPieChart\(pieHolder,s\.grossCats/);
assert.ok(src.includes('return makeDonutChart(items,size,true,maxParts)'),
 'Medium and Large category pies must be full solid pies, never hollow Donuts');
assert.match(src,/addStackedChart\(right,donutParts\(s\.grossPayments/);

assert.match(src,/if\(family==='small'\)/);
assert.match(src,/if\(family==='medium'\)/);
assert.match(src,/if\(family==='large'\)/);
assert.match(src,/iPad Extra Large/);
assert.match(src,/async function previewWidget\(\)/);
assert.match(src,/if\(isPad\)choices\.push\('Extra Large/);
assert.match(src,/function manualFormHTML\(/);
assert.match(src,/function dashboardHTML\(/);
assert.match(src,/function buildWidget\(/);
assert.match(src,/async function importData\(/);
assert.match(src,/async function app\(/);
assert.ok(src.includes('EXPENSE_QUICK_MANUAL'),'Quick shortcut must remain available');
assert.ok(src.includes('amount===null'),'Never write empty or zero amounts');
assert.ok(src.includes('transactions.previous.json'),'Local pre-overwrite recovery copy must remain');
const runtime=[
 canonical,
 'widgets/expense-tracker/HK-Expense-Input-Diagnostic.js',
 'widgets/bus-eta/HK-Bus-ETA.js',
 'widgets/mtr-next-train/standard/HK-MTR-Next-Train.js',
 'widgets/mtr-next-train/adaptive/HK_MTR_Next_Train.js'
];
let lines=0,credentialFlags=0;
for(const p of runtime){
 const t=read(p);lines+=t.split(/\r?\n/).length;
 cp.execFileSync(process.execPath,['--check',path.join(root,p)]);
 assert.ok(!/\b(?:eval\s*\(|new\s+Function\s*\()/.test(t),'Dynamic code evaluator in '+p);
 assert.ok(!/\b(?:TODO|FIXME|HACK|XXX)\b/.test(t),'Unresolved placeholder in '+p);
 const pattern=/\b(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{10,}["']/gi;
 const count=(t.match(pattern)||[]).length;
 credentialFlags+=count;
 assert.equal(count,0,'Obvious hardcoded credential assignment in '+p);
}
const helpers=[...src.matchAll(/(?:^|\n)(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
const duplicate=helpers.filter((n,i)=>helpers.indexOf(n)!==i);
assert.deepEqual(duplicate,[],'Duplicate named function declarations');
const orphan=helpers.filter(n=>(src.match(new RegExp('\\b'+n+'\\b','g'))||[]).length===1);
assert.deepEqual(orphan,[],'Unused named function declarations require cleanup or explicit justification');
const urls=[...src.matchAll(/https?:\/\/[^"'\s)<>\\]+/g)].map(m=>m[0]);
const external=urls.filter(x=>!/^https:\/\/(?:api\.frankfurter\.dev|frankfurter\.dev|expense-editor\.invalid)\b/.test(x)
 && !/^http:\/\/www\.w3\.org\/2000\/svg/.test(x));
assert.deepEqual(external,[],'Unreviewed remote URL in Expense script');
console.log('PASS source-audit: 5 canonical runtime scripts; '+lines+
 ' lines syntax checked, intentional mirror identical, no obvious hardcoded credential assignments ('+
 credentialFlags+'), no dead named helpers or dynamic evaluators');
