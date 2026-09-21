/* 관종 비교표. 표에 들어가는 값과 장단점 문장은 모두 자료 원문의 표현을 그대로 옮긴 것이고,
   사내 비교자료에 없는 관종은 공개 표준으로 정리해 출처 뱃지로 구분한다. */
(() => {
 'use strict';
 const data=PIPE_MATERIALS, $=id=>document.getElementById('mc-'+id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 let shown=new Set(data.materials.map(m=>m.id));
 const PRESETS=[['all','전체',()=>data.materials],['supply','상수도',()=>data.materials.filter(m=>m.useScope!=='sewer')],
  ['sewer','하수도',()=>data.materials.filter(m=>m.useScope!=='supply')],['khe','사내 자료',()=>data.materials.filter(m=>m.source==='khe')]];
 function renderChips(){
  $('chips').innerHTML='<div class="mc-presets">'+PRESETS.map(([k,t])=>'<button type="button" class="mc-preset" data-preset="'+k+'">'+esc(t)+'</button>').join('')+'</div>'+
   data.materials.map(m=>'<button type="button" class="mc-chip'+(shown.has(m.id)?' active':'')+'" data-mat="'+m.id+'" aria-pressed="'+shown.has(m.id)+'">'+esc(m.name)+(m.alias?' <small>'+esc(m.alias)+'</small>':'')+'</button>').join('');
  $('chips').querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.mat;
   if(shown.has(id)){if(shown.size>1)shown.delete(id);}else shown.add(id);
   renderChips();renderTable();
  });
  $('chips').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
   const list=PRESETS.find(x=>x[0]===b.dataset.preset)[2]();
   shown=new Set(list.map(m=>m.id));renderChips();renderTable();
  });
 }
 function cellHtml(m,row){
  if(row.key==='cost'){
   const labels=m.cells.costLabels||[];
   return '<ul class="mc-cost">'+labels.map(l=>'<li>'+esc(l)+' <span class="mc-blank">미기재</span></li>').join('')+'</ul>';
  }
  const values=m.cells[row.key]||[];
  if(!values.length)return '<span class="mc-blank">미기재</span>';
  return values.length===1?esc(values[0]):'<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
 }
 function renderTable(){
  const mats=data.materials.filter(m=>shown.has(m.id));
  const groups=[...new Set(data.rows.map(r=>r.group))];
  let html='<thead><tr><th scope="col" class="mc-row-head">구분</th>'+mats.map(m=>'<th scope="col"'+(m.recommended?' class="mc-th-pick"':'')+'>'+esc(m.name)+(m.alias?'<small>'+esc(m.alias)+'</small>':'')+'<span class="mc-std">'+esc(m.standard)+'</span>'+(m.recommended?'<span class="mc-pick-badge">원문 추천</span>':'')+(m.source==='ref'?'<span class="mc-src mc-src-ref">공개 표준</span>':'')+'</th>').join('')+'</tr></thead>';
  for(const g of groups){
   const rows=data.rows.filter(r=>r.group===g);
   html+='<tbody class="mc-group-tbody"><tr class="mc-group-row" role="button" tabindex="0" onclick="this.parentElement.classList.toggle(\'mc-collapsed\')"><th colspan="'+(mats.length+1)+'" scope="colgroup"><span>'+esc(g)+' <span class="mc-toggle-icon">▼</span></span></th></tr>'+
    rows.map(r=>'<tr><th scope="row" class="mc-row-head">'+esc(r.label)+(r.source==='ref'?'<span class="mc-src mc-src-ref">참고</span>':'')+'</th>'+
     mats.map(m=>'<td'+(r.short?' class="mc-short"':'')+'>'+cellHtml(m,r)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  }
  html+='<tbody class="mc-group-tbody"><tr class="mc-group-row" role="button" tabindex="0" onclick="this.parentElement.classList.toggle(\'mc-collapsed\')"><th colspan="'+(mats.length+1)+'" scope="colgroup"><span>장점 / 단점 <span class="mc-toggle-icon">▼</span></span></th></tr>'+
   '<tr><th scope="row" class="mc-row-head">장점</th>'+mats.map(m=>'<td><ul class="mc-pro">'+m.pros.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></td>').join('')+'</tr>'+
   '<tr><th scope="row" class="mc-row-head">단점</th>'+mats.map(m=>'<td><ul class="mc-con">'+m.cons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></td>').join('')+'</tr></tbody>';
  $('table').innerHTML=html;
 }

 /* 표가 세로로는 넘치지 않으므로 휠을 가로 이동으로 돌린다.
    양 끝에 닿으면 가로 이동을 놓아 페이지가 다시 세로로 스크롤되게 한다. */
 function wheelToHorizontal(el){
  el.addEventListener('wheel',e=>{
   if(e.deltaY===0||e.shiftKey)return;
   const max=el.scrollWidth-el.clientWidth;
   if(max<=0)return;
   if((e.deltaY<0&&el.scrollLeft<=0)||(e.deltaY>0&&el.scrollLeft>=max-1))return;
   e.preventDefault();el.scrollLeft+=e.deltaY;
  },{passive:false});
 }

 $('notes').innerHTML=data.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+
  '<li>'+esc(data.sources.khe.note)+'</li><li>'+esc(data.sources.ref.note)+'</li>';
 renderChips();renderTable();

})();
