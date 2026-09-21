/* 관종 비교표. 표에 들어가는 값과 장단점 문장은 모두 자료 원문의 표현을 그대로 옮긴 것이고,
   사내 비교자료에 없는 관종은 공개 표준으로 정리해 출처 뱃지로 구분한다. */
(() => {
 'use strict';
 const data=PIPE_MATERIALS, $=id=>document.getElementById('mc-'+id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 const PRESETS=[['all','전체',()=>data.materials],['supply','상수도',()=>data.materials.filter(m=>m.useScope!=='sewer')],
  ['sewer','하수도',()=>data.materials.filter(m=>m.useScope!=='supply')],['khe','사내 자료',()=>data.materials.filter(m=>m.source==='khe')]];
 /* 11종을 다 펼치면 첫 화면부터 가로 스크롤이라 비교가 안 된다.
    원문 자료의 6종으로 시작하고, 나머지는 칩으로 필요할 때 더한다. */
 let preset='khe';
 let shown=new Set(PRESETS.find(p=>p[0]===preset)[2]().map(m=>m.id));

 function renderChips(){
  $('chips').innerHTML='<div class="mc-presets">'+PRESETS.map(([k,t])=>'<button type="button" class="mc-preset'+(preset===k?' active':'')+'" data-preset="'+k+'" aria-pressed="'+(preset===k)+'">'+esc(t)+'</button>').join('')+'</div>'+
   data.materials.map(m=>'<button type="button" class="mc-chip'+(shown.has(m.id)?' active':'')+'" data-mat="'+m.id+'" aria-pressed="'+shown.has(m.id)+'">'+esc(m.name)+(m.alias?' <small>'+esc(m.alias)+'</small>':'')+'</button>').join('');
  $('chips').querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.mat;
   if(shown.has(id)){if(shown.size>1)shown.delete(id);}else shown.add(id);
   preset='';update();
  });
  $('chips').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
   const list=PRESETS.find(x=>x[0]===b.dataset.preset)[2]();
   preset=b.dataset.preset;shown=new Set(list.map(m=>m.id));update();
  });
 }
 /* 공사비처럼 원문에 값이 없는 항목은 빈 칸만 차지하므로 표에서 뺀다. 비운 이유는 아래 주석에 남아 있다. */
 const cellValues=(m,row)=>m.cells[row.key]||[];
 const hasData=(m,row)=>cellValues(m,row).length>0;
 function cellHtml(m,row){
  const values=cellValues(m,row);
  if(!values.length)return '<span class="mc-blank">미기재</span>';
  return values.length===1?esc(values[0]):'<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
 }
 function renderTable(){
  const mats=data.materials.filter(m=>shown.has(m.id));
  const groups=[...new Set(data.rows.map(r=>r.group))];
  let html='<thead><tr><th scope="col" class="mc-row-head">구분</th>'+mats.map(m=>'<th scope="col"'+(m.recommended?' class="mc-th-pick"':'')+'><div class="mc-th-inner"><div class="mc-th-text">'+esc(m.name)+(m.alias?'<small>'+esc(m.alias)+'</small>':'')+'<span class="mc-std">'+esc(m.standard)+'</span>'+(m.recommended?'<span class="mc-pick-badge">원문 추천</span>':'')+(m.source==='ref'?'<span class="mc-src mc-src-ref">공개 표준</span>':'')+'</div>'+(m.image?'<div class="mc-th-img"><img src="'+esc(m.image)+'" alt=""></div>':'')+'</div></th>').join('')+'</tr></thead>';
  for(const g of groups){
   const rows=data.rows.filter(r=>r.group===g&&mats.some(m=>hasData(m,r)));
   if(!rows.length)continue;
   html+='<tbody class="mc-group-tbody"><tr class="mc-group-row" role="button" tabindex="0" onclick="this.parentElement.classList.toggle(\'mc-collapsed\')"><th colspan="'+(mats.length+1)+'" scope="colgroup"><span>'+esc(g)+' <span class="mc-toggle-icon">▼</span></span></th></tr>'+
    rows.map(r=>'<tr><th scope="row" class="mc-row-head">'+esc(r.label)+(r.source==='ref'?'<span class="mc-src mc-src-ref">참고</span>':'')+'</th>'+
     mats.map(m=>'<td'+(r.short?' class="mc-short"':'')+'>'+cellHtml(m,r)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  }
  $('table').innerHTML=html;
 }
 /* 장단점은 나란히 비교하는 값이 아니라 읽는 문장이라, 표 안에 두면 행 높이만 키운다. */
 function renderProsCons(){
  $('prosbox').innerHTML=data.materials.filter(m=>shown.has(m.id)).map(m=>'<article class="mc-pc-card">'+
   '<h3>'+esc(m.name)+(m.alias?'<small>'+esc(m.alias)+'</small>':'')+'<span class="mc-std">'+esc(m.standard)+'</span>'+
    (m.recommended?'<span class="mc-pick-badge">원문 추천</span>':'')+(m.source==='ref'?'<span class="mc-src mc-src-ref">공개 표준</span>':'')+'</h3>'+
   '<div class="mc-pc-lists">'+
    '<div class="mc-pc-col mc-pc-pros"><h4>장점</h4><ul class="mc-pro">'+m.pros.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
    '<div class="mc-pc-col mc-pc-cons"><h4>단점</h4><ul class="mc-con">'+m.cons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>'+
   '</div></article>').join('');
 }
 function update(){renderChips();renderTable();renderProsCons();}

 $('notes').innerHTML=data.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+
  '<li>'+esc(data.sources.khe.note)+'</li><li>'+esc(data.sources.ref.note)+'</li>';
 update();
})();
