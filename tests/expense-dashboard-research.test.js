// Validate source map integrity without falsely claiming to re-fetch 100 URLs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const p=path.join(__dirname,'..','docs/EXPENSE_DASHBOARD_RESEARCH_100.md');
const text=fs.readFileSync(p,'utf8');
const start=text.indexOf('## Indexed sources (all individually linked)');
const end=text.indexOf('## Acceptance checklist',start);
assert.ok(start>=0&&end>start);
const block=text.slice(start,end);
const rows=block.split(/\r?\n/).filter(l=>/^\d{3}\.\s+\*\*/.test(l));
assert.equal(rows.length,100,'Research bibliography must have 100 distinct page entries');
const urls=rows.map(line=>{
 const m=line.match(/\]\((https:\/\/[^)\s]+)\)$/);
 assert.ok(m,'Each bibliography entry must link to a literal HTTPS official source: '+line);
 return new URL(m[1]);
});
assert.equal(new Set(urls.map(x=>x.href)).size,100,'URLs must be unique');
const counts={};
for(const x of urls)counts[x.hostname]=(counts[x.hostname]||0)+1;
assert.equal(counts['www.w3.org'],40);
assert.equal(counts['www.carbondesignsystem.com'],30);
assert.equal(counts['developer.apple.com'],14);
assert.equal(counts['www.nngroup.com'],12);
assert.equal(counts['help.tableau.com'],3);
assert.equal(counts['baymard.com'],1);
assert.match(text,/100 distinct/);
assert.match(text,/not 100 independent experiments/);
console.log('PASS: 100 unique HTTPS official UX/design/accessibility references with explicit source-category audit');
