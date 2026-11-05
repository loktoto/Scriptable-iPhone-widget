// Provenance integrity: source index, not 100 independent experiments.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=path.join(__dirname,'..','docs/EXPENSE_WIDGET_RESEARCH_100_V3_16.md');
const md=fs.readFileSync(p,'utf8');
const i=md.indexOf('## 附錄：100 個來源完整連結與用途');
const j=md.indexOf('### 來源數量核對',i);
assert.ok(i>=0&&j>i,'Need a bounded 100-item appendix');
const table=md.slice(i,j).split('\n').filter(x=>/^\|\s*\d+\s*\|\s*\[/.test(x));
assert.equal(table.length,100,'Exactly 100 source rows are required');
const urls=table.map((line,n)=>{
 const match=line.match(/^\|\s*(\d+)\s*\|\s*\[[^\]]+\]\((https:\/\/[^)\s]+)\)\s*\|\s*([^|]+)\|/);
 assert.ok(match,'Row '+(n+1)+' missing URL or publisher');
 assert.equal(Number(match[1]),n+1,'Source numbering must be sequential');
 return {url:new URL(match[2]),publisher:match[3].trim()};
});
assert.equal(new Set(urls.map(x=>x.url.href)).size,100,'Source URLs must be unique');
const counts={};
for(const s of urls)counts[s.publisher]=(counts[s.publisher]||0)+1;
for(const [name,num] of Object.entries({'Scriptable':30,'Apple HIG':11,'Apple WidgetKit':9,
  'W3C WCAG22':30,'IBM Design':5,'Tableau':5,'NNGroup':5,'Google Charts':5})){
 assert.equal(counts[name],num,'Unexpected number of indexed '+name+' sources');
}
assert.ok(md.includes('100 URL ≠ 100 獨立實驗'));
assert.ok(md.includes('**最後實機驗收仍未完成**'));
assert.ok(md.includes('v3.15 vs v3.16'));
console.log('PASS: 100 unique official-source references and explicit evidence-tier limits');
