const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/pipe-catalog.json'), 'utf8'));
const { filter, payload } = require('./pipe-catalog-core');
assert.equal(data.records.length, 1126);
assert.equal(new Set(data.records.map(r=>r.id)).size,1126);
for(const r of data.records){
 assert.ok(data.sources[r.source.documentId]);
 assert.ok(fs.existsSync(path.join(root,'data/pipe-sources',r.source.image)));
 assert.equal(r.validation.currentStandardVerified,false);
 for(const [k,v] of Object.entries(r.dimensions)){assert.ok(data.fields[k]);assert.ok(Number.isFinite(v)&&v>0);}
}
assert.equal(filter(data,{query:'닥타일 300',part:'직관',dn:300}).length,2);
assert.equal(filter(data,{material:'강관',part:'곡관',dn:'300',query:'45'}).length,2);
assert.equal(filter(data,{query:'없는규격'}).length,0);
assert.equal(filter(data,{query:'STWW 290'}).length,7);
assert.equal(filter(data,{material:'강관',part:'플랜지관'}).length,0);
const flagged=filter(data,{status:'needs-review'});
assert.equal(flagged.length,5);
// Anchors checked against rendered handbook pages, not calculated from the implementation.
const get=(part,dn,variant,joint='',angle)=>data.records.find(r=>r.part===part&&r.keys.nominalDiameter===dn&&r.keys.variant===variant&&r.keys.joint===joint&&r.keys.angle===angle);
assert.equal(get('플랜지 소켓관',2000,'표준','메커니컬').dimensions.mass,1380);
assert.equal(get('플랜지관',2600,'표준','플랜지 / 삽입구').dimensions.length,1130);
assert.equal(get('이음관',80,'표준','KP메커니컬').dimensions.mass,9.3);
assert.equal(get('직관',1200,'상수 3종').dimensions.massPerLength,420.1);
assert.equal(get('직관',3000,'STWW 400 / A').dimensions.thickness,29);
assert.equal(get('곡관',300,'F12','용접',90).dimensions.radius,410);
assert.equal(get('곡관',300,'F12','용접',45).dimensions.length,450);
assert.equal(get('곡관',3000,'F15','용접',45).dimensions.mass,5230);
assert.ok(!('mass' in get('플랜지 소켓관',2600,'표준','타이튼').dimensions));
assert.equal(get('곡관',80,'A형','KP메커니컬',90).dimensions.mass,11.8);
assert.equal(get('곡관',2600,'B형','KP-L',11.25).dimensions.mass,2745);
assert.equal(get('곡관',1100,'A형','메커니컬',45).validation.status,'needs-review');
assert.ok(!('mass' in get('곡관',1400,'A형','KP메커니컬',45).dimensions));
const exported=payload(data,flagged);
assert.deepEqual(exported.records,flagged);assert.equal(exported.fields.mass.unit,'kg');assert.equal(exported.fields.massPerLength.unit,'kg/m');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
assert.ok(html.includes('kwater-model-review-v1'));
assert.ok(html.includes('data-open-tab="pipes"'));
console.log('PASS: schema, source links, filters, units, source anchors, missing values, review flags, export and script syntax');
