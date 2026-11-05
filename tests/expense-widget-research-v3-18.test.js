// Index integrity does not claim that 104 pages were individually read or visited.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const doc=read('docs/EXPENSE_WIDGET_SCREENSHOT_RESEARCH_104_V3_18.md');
const where=doc.indexOf('## 附錄：本輪新增104個設計研究來源索引');
assert.ok(where>=0,'Missing clearly labelled bibliography');
const lines=doc.slice(where).split(/\r?\n/).filter(x=>/^\|\s*\d+\s*\|/.test(x));
assert.equal(lines.length,104);
const urls=lines.map((x,i)=>{
 const m=x.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|\s*\[[^\]]+\]\((https:\/\/[^)]+)\)\s*\|\s*([^|]+)\|/);
 assert.ok(m,'Invalid bibliography row '+(i+1));assert.equal(+m[1],i+1);
 assert.ok(['High','Supplementary'].includes(m[4].trim()));
 return new URL(m[3]).href;
});
assert.equal(new Set(urls).size,104,'References must all be distinct');
const previous=['docs/EXPENSE_WIDGET_RESEARCH_100_V3_16.md','docs/EXPENSE_DASHBOARD_RESEARCH_100.md'];
const prior=new Set(previous.flatMap(p=>[...read(p).matchAll(/https:\/\/[^)\s>]+/g)]
 .map(m=>m[0].replace(/\/$/,''))));
for(const url of urls)assert.ok(!prior.has(url.replace(/\/$/,'')),
 'New bibliography must not recycle previous 100+100 URL: '+url);
assert.match(doc,/並無逐一精讀 104 頁/);
assert.match(doc,/實機截圖/);
assert.match(doc,/monthOnlyToday/);
assert.match(doc,/HK\$15\.30/);
console.log('PASS: 104 fresh, unique, publisher-directory sources, honest methodology and screenshot evidence categories');
